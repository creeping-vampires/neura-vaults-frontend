import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(t)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [isOpen]);

  const NeuraLogo = () => (
    <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden">
      <img
        src="/logo.webp"
        alt="Neura Vault"
        className="w-full h-full object-contain"
      />
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 h-[600px]">
      {!isOpen && (
        <div className="fixed bottom-[17px] right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-background p-0.5 rounded-full shadow-[0_0_10px_1px] shadow-foreground/60 transition-all duration-300 hover:scale-105"
          >
            <NeuraLogo />
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className={`bg-[#0A0A0A] backdrop-blur-sm border border-[#404040] rounded-lg shadow-2xl overflow-hidden w-[440px] ${
          isOpen ? "opacity-100" : "max-w-0 max-h-0 border-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-2 pr-3 py-2 border-b border-[#404040]">
          <div className="flex items-center gap-0">
            <NeuraLogo />
            <div>
              <h3 className="text-[#FAFAFA] font-medium text-xl">Neura AI</h3>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#262626] rounded transition-colors"
          >
            <X className="h-5.5 w-5.5 text-[#A1A1A1]" />
          </button>
        </div>
        <iframe
          src="https://neurachatbot-production.up.railway.app/"
          width="100%"
          height="500px"
          title="Chatbot"
        />
      </div>
    </div>
  );
};

export default ChatBot;
