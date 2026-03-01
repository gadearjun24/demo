import asyncio
import threading
import time
import uuid
import logging
import torch
import uvicorn
from fastapi import FastAPI, Request
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import List, Dict
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer, 
    TextIteratorStreamer
)

# --- 1. ADVANCED LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(threadName)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("InferenceEngine")

# --- 2. SYSTEM & MODEL CONFIGURATION ---
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"[*] Detected Accelerator: {DEVICE.upper()}")

# Optimization: Use Float16 for GPU to double speed; Float32 for CPU
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32
logger.info(f"[*] Precision Mode: {DTYPE}")

# Global Job Queue
job_queue = asyncio.Queue()

# --- 3. MODEL INITIALIZATION ---
try:
    logger.info(f"[*] Loading Tokenizer: {MODEL_ID}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

    logger.info(f"[*] Loading Model: {MODEL_ID}...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=DTYPE,
        device_map="auto",
        low_cpu_mem_usage=True  # Optimization for faster loading
    )
    
    # Optimization: Compile model for faster inference (Linux/GPU only)
    if DEVICE == "cuda" and hasattr(torch, "compile"):
        try:
            logger.info("[*] Compiling model with torch.compile (this may take a moment)...")
            model = torch.compile(model)
        except Exception as e:
            logger.warning(f"[!] Compilation failed, falling back to eager mode: {e}")

    model.eval() # Critical: Set to eval mode
    logger.info("[*] Model Ready.")
except Exception as e:
    logger.critical(f"FATAL: Model failed to load. {e}")
    raise e

# --- 4. DATA SCHEMAS ---
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    max_tokens: int = 512
    temperature: float = 0.7
    top_p: float = 0.9

# --- 5. INFERENCE LOGIC (THREAD SAFE) ---
def run_generation(loop, history, max_tokens, temp, top_p, request_id, out_queue):
    """
    Executed in a separate thread to prevent blocking the asyncio event loop.
    """
    start_time = time.time()
    first_token_time = None
    token_count = 0
    
    try:
        logger.info(f"[{request_id}] Processing... (Context: {len(history)} msgs)")

        # 1. Tokenization
        # Optimization: return_dict=True ensures compatibility with **kwargs
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
            temperature=temp,
            top_p=top_p,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )

        # 2. Start Generation in Thread
        # Optimization: inference_mode disables grad for speed
        with torch.inference_mode():
            gen_thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
            gen_thread.start()

        # 3. Consume Stream
        for new_text in streamer:
            if first_token_time is None:
                first_token_time = time.time()
                ttft = (first_token_time - start_time) * 1000
                logger.info(f"[{request_id}] TTFT: {ttft:.2f}ms")

            token_count += 1
            # Push to async queue safely
            loop.call_soon_threadsafe(out_queue.put_nowait, new_text)

        total_time = time.time() - start_time
        tps = token_count / total_time if total_time > 0 else 0
        logger.info(f"[{request_id}] DONE. Tokens: {token_count} | TPS: {tps:.2f}")

    except Exception as e:
        logger.error(f"[{request_id}] Generation Error: {e}")
        loop.call_soon_threadsafe(out_queue.put_nowait, f"[ERROR: {str(e)}]")
    
    finally:
        loop.call_soon_threadsafe(out_queue.put_nowait, "[DONE]")


# --- 6. BACKGROUND WORKER ---
async def llm_worker():
    """
    Continuous loop that picks jobs from the queue and spawns generation threads.
    """
    logger.info("[*] Worker started. Waiting for jobs...")
    main_loop = asyncio.get_running_loop()

    while True:
        job = await job_queue.get()
        
        # Spawn a thread for this job immediately (Non-blocking)
        threading.Thread(
            target=run_generation,
            args=(
                main_loop, 
                job["history"], 
                job["max_tokens"], 
                job["temperature"],
                job["top_p"],
                job["request_id"],
                job["response_queue"]
            ),
            daemon=True
        ).start()
        
        job_queue.task_done()

# --- 7. FASTAPI APP ---
app = FastAPI(title="High-Performance LLM Cluster")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(llm_worker())

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] Request received.")

    client_queue = asyncio.Queue()

    # Enqueue job
    await job_queue.put({
        "history": [msg.model_dump() for msg in request.messages],
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "top_p": request.top_p,
        "response_queue": client_queue,
        "request_id": request_id
    })

    async def event_generator():
        try:
            while True:
                token = await client_queue.get()
                if token == "[DONE]":
                    break
                yield {"data": token}
        except asyncio.CancelledError:
            logger.warning(f"[{request_id}] Client disconnected.")
            # Note: The thread will continue until completion, but results are discarded.

    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    # Optimization: 'uvloop' (if installed) is automatically used by uvicorn for speed
    logger.info("[*] Starting Uvicorn Server...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        log_level="warning" # Reduce Uvicorn noise, rely on custom logger
    )
