from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
from threading import Thread
import torch

# 1. Setup Model (Qwen 0.5B - ~900MB in RAM)
model_id = "Qwen/Qwen2.5-0.5B-Instruct"

print("Loading model... This fits in 8GB RAM easily.")
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype="auto",
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_id)

# 2. Initialize Chat History
def get_fresh_history():
    return [{"role": "system", "content": "You are a helpful and accurate assistant."}]

history = get_fresh_history()

print("\n--- Chat Started ---")
print("Commands: '/exit' to quit, '/clear' to reset memory")

while True:
    user_input = input("\n\nUser: ").strip()
    
    if not user_input: continue
    if user_input.lower() in ["/exit", "exit", "quit"]: break
    if user_input.lower() == "/clear":
        history = get_fresh_history()
        print("Memory cleared!")
        continue

    history.append({"role": "user", "content": user_input})
    
    # 4. FIXED: Extract input_ids and attention_mask correctly
    model_inputs = tokenizer.apply_chat_template(
        history, 
        tokenize=True, 
        add_generation_prompt=True, 
        return_tensors="pt",
        return_dict=True  # Ensure we get a dict
    ).to(model.device)

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    
    # 5. FIXED: Unpack the dictionary (**model_inputs)
    generation_kwargs = dict(
        **model_inputs, # This passes input_ids AND attention_mask
        streamer=streamer,
        max_new_tokens=512,
        temperature=0.7,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    print("Assistant: ", end="", flush=True)
    full_response = ""
    for new_text in streamer:
        print(new_text, end="", flush=True)
        full_response += new_text
    
    history.append({"role": "assistant", "content": full_response})

print("\nExiting. Goodbye!")
