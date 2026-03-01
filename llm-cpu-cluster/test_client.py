import os
import requests
import sys
import json

# ==============================
# CONFIGURATION
# ==============================

URL = "https://arjungade-ai.hf.space/chat"
HF_TOKEN = os.getenv("HF_TOKEN", "")

# --- ADD YOUR SYSTEM PROMPT HERE ---
SYSTEM_PROMPT = """You are a helpful, brilliant, and versatile AI assistant. 
You excel at coding, complex reasoning, creative writing, and providing clear, factual information. 
- If asked for code, provide clean, efficient, and well-commented snippets.
- If asked for technical help, be precise and direct.
- For general questions, be helpful and engaging.
- Maintain a professional yet accessible tone."""

# ANSI Colors
BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
PURPLE = "\033[95m"
RESET = "\033[0m"
BOLD = "\033[1m"

# ==============================
# CORE CLIENT CLASS
# ==============================

class ChatClient:
    def __init__(self, api_url):
        self.url = api_url
        self.session = requests.Session()
        self.headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Accept": "text/event-stream",
            "Content-Type": "application/json",
        }

    def stream_chat(self, messages):
        payload = {
            "messages": messages,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.9,
        }

        full_response = ""
        
        try:
            with self.session.post(self.url, headers=self.headers, json=payload, stream=True, timeout=(5, None)) as response:
                if response.status_code != 200:
                    print(f"\n❌ Error {response.status_code}: {response.text}")
                    return ""

                for line in response.iter_lines(decode_unicode=True):
                    if not line or not line.startswith("data: "):
                        continue

                    # Extract the JSON string after "data: "
                    raw_json = line[6:] 
                    
                    try:
                        data = json.loads(raw_json)
                        
                        # Check for completion signal
                        if data.get("done") is True:
                            break
                        
                        # Extract and print only the text content
                        if "content" in data:
                            token = data["content"]
                            print(token, end="", flush=True)
                            full_response += token
                            
                    except json.JSONDecodeError:
                        # Handle the case where the token is [DONE] but not JSON
                        if raw_json.strip() == "[DONE]":
                            break
                        continue
                        
        except requests.exceptions.ConnectionError:
            print(f"\n❌ Connection Error: Is the server running at {self.url}?")
        except Exception as e:
            print(f"\n❌ Unexpected Error: {e}")

        return full_response

# ==============================
# MAIN INTERFACE
# ==============================

def main():
    client = ChatClient(URL)
    
    # Initialize conversation with the System Prompt
    conversation = [{"role": "system", "content": SYSTEM_PROMPT}]

    print(f"\n{BOLD}{BLUE}=== LLM TERMINAL CHAT ==={RESET}")
    print(f"{PURPLE}System Prompt Active: {SYSTEM_PROMPT}{RESET}")
    print(f"{YELLOW}Commands: 'exit', 'quit', 'clear'{RESET}\n")

    while True:
        try:
            user_input = input(f"{BOLD}{GREEN}You:{RESET} ").strip()
        except KeyboardInterrupt:
            break

        if not user_input:
            continue
            
        if user_input.lower() in {"exit", "quit"}:
            break
            
        if user_input.lower() == "clear":
            # Reset but keep the system prompt at the top
            conversation = [{"role": "system", "content": SYSTEM_PROMPT}]
            os.system('cls' if os.name == 'nt' else 'clear')
            print(f"{YELLOW}Conversation cleared (System Prompt retained).{RESET}")
            continue

        # Add User Message to history
        conversation.append({"role": "user", "content": user_input})

        # Process Stream
        print(f"{BOLD}{BLUE}Assistant:{RESET} ", end="", flush=True)
        assistant_reply = client.stream_chat(conversation)
        print("\n" + "─" * 40)

        # Save Assistant reply to history
        if assistant_reply:
            conversation.append({"role": "assistant", "content": assistant_reply})

    print(f"\n{YELLOW}👋 Goodbye!{RESET}")

if __name__ == "__main__":
    main()