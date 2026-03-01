import React, { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

// Components
import InputSection from "./components/InputSection";
import MessageSection from "./components/MessageSection";
import IntroSection from "./components/IntroSection";
import SideBar from "./components/SideBar";
import HeaderSection from "./components/HeaderSection";

const SYSTEM_PROMPT =
  "You are NxtAI, a high-performance You provide precise, elegant, and helpful responses.";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Handle Textarea Auto-resize
  const handleInput = (e) => {
    const target = e.target;
    setInput(target.value);
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  const copyToClipboard = (text, id) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Advanced Markdown & Math Processing
  const processContent = (content) => {
    if (!content) return "";
    try {
      // 1. Handle LaTeX Math
      let processed = content
        .replace(
          /\$\$([\s\S]+?)\$\$/g,
          (m, f) =>
            `<div class="math-block">${katex.renderToString(f, { displayMode: true, throwOnError: false })}</div>`,
        )
        .replace(/\$([^\$\n]+?)\$/g, (m, f) =>
          katex.renderToString(f, { displayMode: false, throwOnError: false }),
        );

      // 2. Configure Marked with Highlight.js
      marked.setOptions({
        highlight: (code, lang) => {
          const language = hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(code, { language }).value;
        },
        langPrefix: "hljs language-",
        gfm: true,
        breaks: true,
      });

      const html = marked.parse(processed);
      return DOMPurify.sanitize(html);
    } catch (error) {
      console.error("Processing Error:", error);
      return content;
    }
  };

  const sendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const finalInput = overrideText || input;
    if (!finalInput.trim() || isGenerating) return;

    // Add User Message
    const userMsg = { id: Date.now(), role: "user", content: finalInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    // Reset Textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    abortControllerRef.current = new AbortController();
    let accumulatedText = "";

    try {
      const response = await fetch("https://arjungade-ai.hf.space/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: finalInput },
          ],
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Add a placeholder AI message
      const aiMsgId = Date.now() + "-ai";
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: "assistant", content: "", isTyping: true },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (rawData === "[DONE]") break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.content) {
                accumulatedText += parsed.content;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  const lastIdx = newMsgs.length - 1;
                  if (newMsgs[lastIdx].role === "assistant") {
                    newMsgs[lastIdx].content = accumulatedText;
                  }
                  return newMsgs;
                });
              }
            } catch (jsonErr) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Generation stopped by user.");
      } else {
        console.error("Fetch Error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + "-err",
            role: "assistant",
            content:
              "⚠️ **System Error:** Failed to establish uplink. Check your connection or API status.",
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
      setMessages((prev) => {
        const newMsgs = [...prev];
        if (newMsgs.length > 0) {
          newMsgs[newMsgs.length - 1].isTyping = false;
        }
        return newMsgs;
      });
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0e0e10] text-gray-200 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar - Desktop static, Mobile absolute */}
      <div
        className={`
        fixed inset-0 z-40 lg:relative lg:z-0 lg:flex 
        ${isSidebarOpen ? "flex" : "hidden"} lg:block
      `}
      >
        {/* Mobile Overlay */}
        <div
          className="absolute inset-0 bg-black/60 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* <SideBar /> */}
      </div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#131314]">
        {/* Header - Passing toggle for mobile */}
        <HeaderSection onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {messages.length === 0 ? (
              <IntroSection sendMessage={sendMessage} setInput={setInput} />
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <MessageSection
                    key={msg.id}
                    msg={msg}
                    copiedId={copiedId}
                    copyToClipboard={copyToClipboard}
                    processContent={processContent}
                  />
                ))}
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>
        </div>

        {/* Floating Input Area */}
        <footer className="w-full bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <InputSection
              handleInput={handleInput}
              input={input}
              isGenerating={isGenerating}
              stopGeneration={stopGeneration}
              sendMessage={sendMessage}
              textareaRef={textareaRef}
            />

            <div className="flex flex-col items-center gap-1 mt-4 opacity-50">
              <p className="text-center text-[10px] md:text-[11px] tracking-wide text-gray-500 uppercase font-bold">
                NxtAI Neural Link — Secure Terminal
              </p>
              <p className="text-[9px] text-gray-600 text-center">
                AI model may produce inaccurate data
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
