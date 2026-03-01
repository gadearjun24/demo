import asyncio
import json
import os
import threading
import aio_pika
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

# --- Config ---
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
MODEL_ID = os.getenv("MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
JOB_QUEUE_NAME = "llm_jobs"

# --- 1. Load Model (Global State) ---
print(f"Worker loading {MODEL_ID}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, 
    torch_dtype="auto", 
    device_map="auto"
)
print("Worker READY.")

# --- 2. The Inference Logic ---
def run_inference_sync(history, max_tokens, callback_queue):
    """
    Runs in a separate thread. Puts tokens into a thread-safe queue.
    """
    model_inputs = tokenizer.apply_chat_template(
        history, 
        tokenize=True, 
        add_generation_prompt=True, 
        return_tensors="pt",
        return_dict=True
    ).to(model.device)

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    
    generation_kwargs = dict(
        **model_inputs,
        streamer=streamer,
        max_new_tokens=max_tokens,
        do_sample=True,
        temperature=0.7,
        pad_token_id=tokenizer.eos_token_id
    )

    # Start generation
    thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    # Consume stream and push to callback queue
    for new_text in streamer:
        callback_queue.put(new_text)
    
    callback_queue.put("[DONE]")

# --- 3. The RabbitMQ Consumer ---
async def main():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    
    # Prefetch=1 ensures a worker only takes 1 job at a time
    await channel.set_qos(prefetch_count=1)
    
    # Declare the shared job queue
    queue = await channel.declare_queue(JOB_QUEUE_NAME, auto_delete=False)

    print(f" [*] Waiting for messages in '{JOB_QUEUE_NAME}'")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                # 1. Parse Job
                data = json.loads(message.body.decode())
                reply_to = message.reply_to  # The unique queue to answer to
                print(f"Processing job for {reply_to}")

                # 2. Setup bridging queue (Thread -> Async Loop)
                token_queue = asyncio.Queue()
                
                # 3. Run Inference in Thread (Non-blocking for the Event Loop)
                # We use a sync wrapper to bridge the streamer to asyncio
                loop = asyncio.get_event_loop()
                # We define a small sync function to feed the asyncio queue
                def sync_producer():
                    # This inner function runs in the thread
                    # It needs a thread-safe way to push to the asyncio loop
                    # Standard queue.Queue is easier here, but let's use call_soon_threadsafe
                    
                    model_inputs = tokenizer.apply_chat_template(
                        data['history'], tokenize=True, add_generation_prompt=True, 
                        return_tensors="pt", return_dict=True
                    ).to(model.device)
                    
                    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
                    kwargs = dict(**model_inputs, streamer=streamer, max_new_tokens=512)
                    
                    gen_thread = threading.Thread(target=model.generate, kwargs=kwargs)
                    gen_thread.start()
                    
                    for text in streamer:
                        # Push to async queue from thread
                        loop.call_soon_threadsafe(token_queue.put_nowait, text)
                    
                    loop.call_soon_threadsafe(token_queue.put_nowait, "[DONE]")

                # Start the thread
                threading.Thread(target=sync_producer).start()

                # 4. Stream results back to RabbitMQ
                while True:
                    token = await token_queue.get()
                    if token == "[DONE]":
                        # Send final signal
                        await channel.default_exchange.publish(
                            aio_pika.Message(body="[DONE]".encode()),
                            routing_key=reply_to
                        )
                        break
                    
                    # Send token
                    await channel.default_exchange.publish(
                        aio_pika.Message(body=token.encode()),
                        routing_key=reply_to
                    )

if __name__ == "__main__":
    asyncio.run(main())
