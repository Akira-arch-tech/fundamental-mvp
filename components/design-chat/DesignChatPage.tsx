"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import type { AgentState, ChatMessage, SSEEvent, QuickReply } from "@/lib/design-agent/types";
import ChatHeader from "./ChatHeader";
import ChatMessageItem from "./ChatMessageItem";
import ChatInputBar from "./ChatInputBar";

const INITIAL_AGENT_STATE: AgentState = { step: "product_select" };

const WELCOME: ChatMessage = {
  id: "welcome-0",
  role: "agent",
  content: "こんにちは！FUNDAMENTALへようこそ🎉\n\nどんなグッズを作りたいですか？",
  timestamp: Date.now(),
  quickReplies: [
    { label: "🎴 アクリルスタンド", value: "アクリルスタンド" },
    { label: "👕 Tシャツ", value: "Tシャツ" },
  ],
};

export default function DesignChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [agentState, setAgentState] = useState<AgentState>(INITIAL_AGENT_STATE);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const nextId = () => `msg-${++idCounter.current}-${Date.now()}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (loading || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      // Clear quick replies from previous agent messages
      setMessages((prev) =>
        prev.map((m) => (m.role === "agent" ? { ...m, quickReplies: undefined } : m)),
      );
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const agentMsgId = nextId();
      const agentMsg: ChatMessage = {
        id: agentMsgId,
        role: "agent",
        content: "",
        timestamp: Date.now(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, agentMsg]);

      let currentState = { ...agentState };
      let accText = "";

      const patch = (updates: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsgId ? { ...m, ...updates } : m)),
        );
      };

      try {
        const res = await fetch("/api/design-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), state: currentState }),
        });

        if (!res.body) throw new Error("no body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const chunk of parts) {
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              let event: SSEEvent;
              try {
                event = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              switch (event.type) {
                case "text":
                  accText += (accText ? "\n" : "") + event.content;
                  patch({ content: accText, isTyping: false, isGenerating: false });
                  break;

                case "generating":
                  patch({ isTyping: false, isGenerating: true });
                  break;

                case "image":
                  patch({ designUrl: event.url, isGenerating: false });
                  break;

                case "mockup":
                  patch({ mockupData: event.data });
                  break;

                case "quick_replies":
                  patch({ quickReplies: event.items });
                  break;

                case "order":
                  patch({ orderData: event.data });
                  break;

                case "state":
                  currentState = { ...currentState, ...event.patch };
                  setAgentState(currentState);
                  break;

                case "error":
                  patch({ content: event.message, isTyping: false, isGenerating: false });
                  break;

                case "done":
                  patch({ isTyping: false, isGenerating: false });
                  break;
              }
            }
          }
        }
      } catch {
        patch({
          content: "エラーが発生しました。もう一度お試しください。",
          isTyping: false,
          isGenerating: false,
        });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentState, loading],
  );

  // Find last agent message index for quick replies placement
  const lastAgentIdx = messages.reduce(
    (acc, m, i) => (m.role === "agent" ? i : acc),
    -1,
  );

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#EEF0F3] shadow-2xl relative overflow-hidden">
      <ChatHeader />

      {/* Date chip */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <span className="text-[11px] text-white/90 bg-black/20 rounded-full px-3 py-0.5">
          {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
        </span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 overscroll-contain">
        {messages.map((msg, idx) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onQuickReply={handleSend}
            isLastAgent={idx === lastAgentIdx}
            disabled={loading}
          />
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>

      <ChatInputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}
