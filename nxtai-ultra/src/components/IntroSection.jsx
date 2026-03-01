import React from "react";
import { Code2, Lightbulb, Compass, PenTool } from "lucide-react";

function IntroSection({ setInput, sendMessage }) {
  const suggestions = [
    {
      title: "Help me write",
      text: "a thank you note to my interviewer",
      icon: <PenTool size={20} className="text-[#d96570]" />,
    },
    {
      title: "Analyze code",
      text: "explain how this regex works step by step",
      icon: <Code2 size={20} className="text-[#4285f4]" />,
    },
    {
      title: "Brainstorm",
      text: "ideas for a low-maintenance indoor garden",
      icon: <Lightbulb size={20} className="text-[#ffba00]" />,
    },
    {
      title: "Explore",
      text: "local weekend trips within 3 hours of here",
      icon: <Compass size={20} className="text-[#1ea672]" />,
    },
  ];

  // This handles setting the text and triggering the send
  const handleSuggestionClick = (fullText) => {
    setInput(fullText);
    // Optional: Small delay to let the user see the text populate before sending
    setTimeout(() => {
      sendMessage(null, fullText);
    }, 100);
  };

  return (
    <div className="flex flex-col items-start justify-center min-h-[60vh] px-4 animate-in fade-in duration-1000">
      {/* Main Greeting */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1]">
          <span className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent animate-gradient-x">
            Hello, User
          </span>
          <br />
          <span className="text-[#444746]">How can I help you today?</span>
        </h1>
      </div>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        {suggestions.map((item, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(`${item.title} ${item.text}`)}
            className="group relative flex flex-col justify-between p-5 h-48 bg-[#1e1f20] hover:bg-[#28292a] rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5 text-left active:scale-[0.98]"
          >
            <p className="text-[15px] text-[#e3e3e3] leading-snug group-hover:text-white transition-colors">
              {item.text}
            </p>
            <div className="p-3 bg-[#131314] rounded-xl self-end group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-blue-500/10">
              {item.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default IntroSection;
