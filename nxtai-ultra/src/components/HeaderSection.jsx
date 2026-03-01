import { Bell, ChevronDown } from "lucide-react";
import React from "react";

function HeaderSection() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#131314] border-b border-white/5">
      {/* Brand */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <h1 className="text-[17px] font-semibold text-white tracking-tight">
          Nxt<span className="text-blue-500">AI</span>
        </h1>
        <ChevronDown
          size={14}
          className="text-gray-500 group-hover:text-gray-300 transition-colors"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5">
        <button className="text-gray-500 hover:text-white transition-colors">
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-3 cursor-pointer">
          <span className="hidden sm:block text-[13px] text-gray-300 font-medium">
            Joen Doe
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-800 overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=JoenDoe_Male"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderSection;
