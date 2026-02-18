"use client";

import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="mb-2">
        <h1 className="text-[1.875rem] font-semibold text-text">
          Ask Vibe Caddie
        </h1>
      </div>

      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
