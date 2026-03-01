import {
  Plus,
  MessageSquare,
  History,
  Settings,
  HelpCircle,
  Activity,
  MoreHorizontal,
} from "lucide-react";
import React from "react";

function SideBar() {
  const recentChats = [
    "Project Architectural Design",
    "Quantum Physics Summary",
    "React Performance Audit",
    "NxtAI Branding Concepts",
  ];

  return (
    <aside className="hidden lg:flex w-[280px] flex-col bg-[#131314] border-r border-white/[0.03] p-4 transition-all duration-300">
      {/* Action: New Chat */}
      <div className="mb-6 px-2">
        <button className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-500/20 rounded-2xl text-sm font-semibold text-blue-400 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.05)] active:scale-[0.97]">
          <Plus size={18} strokeWidth={2.5} />
          New Thread
        </button>
      </div>

      {/* Navigation: Recent History */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 mb-4">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            Recent
          </span>
          <History size={14} className="text-gray-600" />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
          {recentChats.map((chat, i) => (
            <div
              key={i}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 
                ${i === 0 ? "bg-white/[0.05] text-white shadow-sm" : "text-gray-400 hover:bg-white/[0.02] hover:text-gray-200"}`}
            >
              <div className="flex items-center gap-3 truncate">
                <MessageSquare
                  size={16}
                  className={i === 0 ? "text-blue-400" : "text-gray-600"}
                />
                <span className="text-sm font-medium truncate">{chat}</span>
              </div>
              <MoreHorizontal
                size={14}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer: System & Settings */}
      <div className="mt-auto pt-4 border-t border-white/[0.05] space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
          <Activity size={18} className="text-emerald-500" />
          <span className="flex-1 text-left">System Health</span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
          <HelpCircle size={18} />
          <span>Help Center</span>
        </button>
      </div>
    </aside>
  );
}

export default SideBar;
