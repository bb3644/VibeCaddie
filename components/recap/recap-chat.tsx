"use client";

import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/chat/message-bubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface RecapChatProps {
  courseName: string;
  playedDate: string;
}

export function RecapChat({ courseName, playedDate }: RecapChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `I've reviewed your recap from ${courseName} on ${playedDate}. Ask me anything — your performance today, patterns in your game, or what to work on next.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, messages: history }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = (await res.json()) as { response: string };
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <span className="text-[0.9375rem] font-semibold text-text">
          Chat with Vibe Caddie
        </span>
        <svg
          className={`w-4 h-4 text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Messages */}
          <div className="flex flex-col gap-3 px-4 py-3 max-h-80 overflow-y-auto border-t border-divider">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex flex-col gap-0.5 max-w-[85%]">
                  <span className="text-[0.75rem] text-secondary ml-1">Vibe Caddie</span>
                  <div className="rounded-2xl p-3 px-4 bg-card border border-divider">
                    <div className="flex items-center gap-1 h-6">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-divider">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your round..."
              disabled={loading}
              className="flex-1 rounded-lg px-3 py-2.5 text-[0.9375rem] text-text border border-divider bg-white placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || input.trim().length === 0}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg bg-accent text-pink hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
