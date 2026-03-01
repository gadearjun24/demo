import { Check, Copy, Sparkles, Share2 } from "lucide-react";
import React, { useEffect, useState } from "react";

function MessageSection({ msg, copiedId, copyToClipboard, processContent }) {
  const isAi = msg.role === "assistant";

  // Effect to handle code block headers and copy logic
  useEffect(() => {
    if (isAi) {
      const codeBlocks = document.querySelectorAll("pre");
      codeBlocks.forEach((block) => {
        if (block.querySelector(".code-header")) return;

        block.style.position = "relative";
        block.style.paddingTop = "40px";

        const header = document.createElement("div");
        header.className =
          "code-header absolute top-0 left-0 right-0 h-10 bg-[#1e1e1e] border-b border-white/5 flex items-center justify-between px-4 rounded-t-xl";

        const dots = document.createElement("div");
        dots.className = "flex gap-1.5 shrink-0";
        dots.innerHTML = `
          <div class="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
        `;

        const btn = document.createElement("button");
        btn.className =
          "flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors ml-2";
        btn.innerHTML = `<span>Copy</span>`;

        btn.onclick = () => {
          const code = block.querySelector("code").innerText;
          navigator.clipboard.writeText(code);
          btn.innerHTML = `<span class="text-green-400">Copied!</span>`;
          setTimeout(() => (btn.innerHTML = `<span>Copy</span>`), 2000);
        };

        header.appendChild(dots);
        header.appendChild(btn);
        block.prepend(header);
      });
    }
  }, [msg.content, isAi]);

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`NxtAI Response: \n\n${msg.content}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      className={`group w-full flex flex-col ${
        isAi ? "items-start" : "items-end"
      } mb-8 md:mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500`}
    >
      {/* Identity Label */}
      <div
        className={`flex items-center gap-2.5 mb-2 ${
          isAi ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <div
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-transform duration-500 group-hover:rotate-[360deg] ${
            isAi
              ? "text-blue-500 bg-blue-500/10 shadow-sm"
              : "text-gray-400 bg-white/5"
          }`}
        >
          {isAi ? (
            <Sparkles size={14} />
          ) : (
            <div className="text-[9px] font-bold">U</div>
          )}
        </div>
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
          {isAi ? "NxtAI" : "You"}
        </span>
      </div>

      {/* Message Container */}
      <div
        className={`relative w-full ${isAi ? "" : "flex flex-col items-end"}`}
      >
        <div
          className={`rounded-2xl transition-all duration-300 ${
            isAi
              ? "w-full text-[#ececec]"
              : "bg-[#2f2f2f] px-4 py-3 md:px-5 md:py-3.5 text-white shadow-md border border-white/5 max-w-[95%] md:max-w-[80%]"
          }`}
        >
          {isAi ? (
            <div
              className="prose prose-invert prose-blue max-w-none 
                         prose-p:text-[15px] md:prose-p:text-[16px] prose-p:leading-[1.7] prose-p:text-[#d1d1d1]
                         prose-pre:my-4 prose-pre:p-0 prose-pre:rounded-xl prose-pre:bg-[#111111] 
                         prose-pre:border prose-pre:border-white/5 prose-pre:shadow-2xl overflow-hidden"
              dangerouslySetInnerHTML={{ __html: processContent(msg.content) }}
            />
          ) : (
            <p className="text-[15px] md:text-[16px] leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          )}
        </div>

        {/* Action Bar - Mobile Visible, Desktop Hover */}
        {isAi && msg.content && (
          <div
            className="flex items-center gap-2 mt-3 
                          opacity-100 lg:opacity-0 lg:group-hover:opacity-100 
                          transition-all duration-300 translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0"
          >
            <button
              onClick={() => copyToClipboard(msg.content, msg.id)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-[#ececec] transition-colors border border-white/5"
            >
              {copiedId === msg.id ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
              <span className="text-[11px] font-bold uppercase tracking-tight">
                Copy
              </span>
            </button>

            <button
              onClick={shareToWhatsApp}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-[#ececec] transition-colors border border-white/5"
            >
              <Share2 size={14} />
              <span className="text-[11px] font-bold uppercase tracking-tight">
                Share
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageSection;
