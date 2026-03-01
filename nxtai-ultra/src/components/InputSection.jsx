import { Send, Square, ImageIcon, Mic, Paperclip } from "lucide-react";
import React from "react";

function InputSection({
  input,
  sendMessage,
  textareaRef,
  isGenerating,
  stopGeneration,
  handleInput,
}) {
  const hasText = input.trim().length > 0;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-2">
      <div className="relative flex flex-col bg-[#212122] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-2 shadow-2xl transition-all duration-300 focus-within:border-white/10">
        {/* Textarea Area */}
        <textarea
          ref={textareaRef}
          rows="1"
          value={input}
          onChange={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
          placeholder="Message NxtAI..."
          className="w-full bg-transparent border-none focus:ring-0 resize-none px-4 py-3 text-[16px] md:text-[17px] text-[#ececec] placeholder:text-gray-500 outline-none min-h-[44px] max-h-[200px] leading-relaxed"
        />

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pb-1 px-1">
          {/* Tool Icons - Hidden on very small screens to save space, or scaled down */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 md:p-2.5 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer  transition-colors"
            >
              <ImageIcon size={18} />
            </button>
            <button
              type="button"
              className="p-2 md:p-2.5 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="p-2 md:p-2.5 hover:bg-white/5 rounded-full text-gray-500 hover:text-white cursor-pointer  transition-colors"
            >
              <Mic size={18} />
            </button>
          </div>

          {/* Send / Stop Buttons */}
          <div className="flex items-center pr-1">
            {isGenerating ? (
              <button
                onClick={stopGeneration}
                className="cursor-pointer  flex items-center justify-center h-10 w-10 rounded-full bg-white/5 border border-red-500/20 text-red-500 transition-all active:scale-95"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={(e) => sendMessage(e)}
                disabled={!hasText}
                className={`flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300 ${
                  hasText
                    ? "bg-white text-black shadow-lg cursor-pointer active:scale-95"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                <Send size={18} className={hasText ? "translate-x-0.5" : ""} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InputSection;
