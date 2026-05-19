"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AgentState, ChatMessage, SSEEvent } from "@/lib/design-agent/types";
import { DEMO_AUTO_SCRIPT } from "@/lib/design-agent/demo-constants";
import ChatHeader from "./ChatHeader";
import ChatMessageItem from "./ChatMessageItem";
import ChatInputBar from "./ChatInputBar";
import DemoCompleteCard from "./DemoCompleteCard";

const INITIAL_AGENT_STATE: AgentState = { step: "welcome" };

const WELCOME: ChatMessage = {
  id: "welcome-0",
  role: "agent",
  content:
    "こんにちは！FUNDAMENTAL DA — Pococha 応援パートナーです🎉\n\nAI Native で推しグッズをデザインし、LINE/Discord の私域運営までお手伝いします。\nご利用の目的を教えてください。",
  timestamp: Date.now(),
  quickReplies: [
    { label: "🏢 B2B：ライバー・事務所向け", value: "B2B" },
    { label: "🎨 個人でグッズを作りたい", value: "C2C" },
  ],
};

const WELCOME_DEMO: ChatMessage = {
  ...WELCOME,
  content:
    "こんにちは！FUNDAMENTAL DA — Pococha 応援パートナーです🎉\n\n【デモモード】下の「3分デモを再生」で、事務所向けフローを自動再生できます。\n※ポコチャ公式との提携ではありません。製品デモ用です。",
  quickReplies: [
    { label: "▶ 3分デモを再生", value: "__RUN_AUTO_DEMO__" },
    { label: "🏢 B2B（手動）", value: "B2B" },
    { label: "🎨 個人注文", value: "C2C" },
  ],
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function DesignChatPage() {
  const searchParams = useSearchParams();
  const isDemoUrl = searchParams.get("demo") === "1";

  const [messages, setMessages] = useState<ChatMessage[]>([isDemoUrl ? WELCOME_DEMO : WELCOME]);
  const [agentState, setAgentState] = useState<AgentState>({
    ...INITIAL_AGENT_STATE,
    demoMode: isDemoUrl,
  });
  const [loading, setLoading] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [showDemoComplete, setShowDemoComplete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const agentStateRef = useRef(agentState);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  const nextId = () => `msg-${++idCounter.current}-${Date.now()}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processSseStream = useCallback(
    async (res: Response, agentMsgId: string) => {
      let currentState = { ...agentStateRef.current };
      let accText = "";

      const patch = (updates: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsgId ? { ...m, ...updates } : m)),
        );
      };

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
              case "copywriting":
                patch({ copywritingContent: event.content, isGenerating: false });
                break;
              case "community_pack":
                patch({ communityPack: event.data, isGenerating: false });
                break;
              case "checkout_link":
                patch({ checkoutLink: event.data, isGenerating: false });
                break;
              case "virtual_gift_hint":
                patch({ virtualGiftHint: event.data, isGenerating: false });
                break;
              case "state":
                currentState = { ...currentState, ...event.patch };
                setAgentState(currentState);
                agentStateRef.current = currentState;
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
    },
    [],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (loading || !text.trim()) return;

      if (text.trim() === "__RUN_AUTO_DEMO__") {
        setDemoPlaying(true);
        setLoading(true);
        try {
          for (const step of DEMO_AUTO_SCRIPT) {
            const userMsg: ChatMessage = {
              id: nextId(),
              role: "user",
              content: step.message,
              timestamp: Date.now(),
            };
            setMessages((prev) =>
              prev
                .map((m) => (m.role === "agent" ? { ...m, quickReplies: undefined } : m))
                .concat(userMsg),
            );

            const agentMsgId = nextId();
            setMessages((prev) => [
              ...prev,
              {
                id: agentMsgId,
                role: "agent",
                content: "",
                timestamp: Date.now(),
                isTyping: true,
              },
            ]);

            const res = await fetch("/api/design-chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: step.message,
                state: agentStateRef.current,
                demo: true,
              }),
            });

            if (!res.ok) throw new Error("demo request failed");
            await processSseStream(res, agentMsgId);
            await sleep(step.pauseMs);
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "agent",
              content: "デモの再生中にエラーが発生しました。",
              timestamp: Date.now(),
            },
          ]);
        } finally {
          setDemoPlaying(false);
          setLoading(false);
        }
        return;
      }

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) =>
        prev.map((m) => (m.role === "agent" ? { ...m, quickReplies: undefined } : m)),
      );
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      const agentMsgId = nextId();
      setMessages((prev) => [
        ...prev,
        {
          id: agentMsgId,
          role: "agent",
          content: "",
          timestamp: Date.now(),
          isTyping: true,
        },
      ]);

      try {
        if (isDemoUrl) {
          // Demo mode: use local playDemoSSE generator instead of fetch
          const { playDemoSSE } = await import("@/lib/design-agent/demo-player");
          const currentState = { ...agentStateRef.current };
          let accText = "";

          const patchMsg = (updates: Partial<ChatMessage>) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === agentMsgId ? { ...m, ...updates } : m)),
            );
          };

          for await (const event of playDemoSSE(text.trim(), currentState)) {
            switch (event.type) {
              case "text":
                if (event.content === "__DEMO_COMPLETE__") {
                  setShowDemoComplete(true);
                  patchMsg({ isTyping: false, isGenerating: false });
                } else {
                  accText += (accText ? "\n" : "") + event.content;
                  patchMsg({ content: accText, isTyping: false, isGenerating: false });
                }
                break;
              case "generating":
                patchMsg({ isTyping: false, isGenerating: true });
                break;
              case "image":
                patchMsg({ designUrl: event.url, isGenerating: false });
                break;
              case "mockup":
                patchMsg({ mockupData: event.data });
                break;
              case "quick_replies":
                patchMsg({ quickReplies: event.items });
                break;
              case "order":
                patchMsg({ orderData: event.data });
                break;
              case "copywriting":
                patchMsg({ copywritingContent: event.content, isGenerating: false });
                break;
              case "state": {
                const newState = { ...agentStateRef.current, ...event.patch };
                setAgentState(newState);
                agentStateRef.current = newState;
                break;
              }
              case "error":
                patchMsg({ content: event.message, isTyping: false, isGenerating: false });
                break;
              case "done":
                patchMsg({ isTyping: false, isGenerating: false });
                break;
            }
          }
        } else {
          const res = await fetch("/api/design-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text.trim(),
              state: agentStateRef.current,
              demo: agentStateRef.current.demoMode === true,
            }),
          });

          if (!res.ok) throw new Error("request failed");
          await processSseStream(res, agentMsgId);
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content: "エラーが発生しました。もう一度お試しください。",
                  isTyping: false,
                  isGenerating: false,
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, processSseStream, isDemoUrl],
  );

  const lastAgentIdx = messages.reduce(
    (acc, m, i) => (m.role === "agent" ? i : acc),
    -1,
  );

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#EEF0F3] shadow-2xl relative overflow-hidden">
      <ChatHeader isDemo={isDemoUrl} />

      {isDemoUrl && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex-shrink-0">
          <span className="font-semibold">デモモード</span>
          ：ポコチャ公式未提携の製品デモです。
          <Link href="/pococha-virtual-gift" className="underline ml-1 text-amber-800">
            バーチャルギフト概念
          </Link>
          {demoPlaying && <span className="block mt-1 text-amber-700">▶ 自動再生中…</span>}
        </div>
      )}

      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <span className="text-[11px] text-white/90 bg-black/20 rounded-full px-3 py-0.5">
          {new Date().toLocaleDateString("ja-JP", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 overscroll-contain">
        {messages.map((msg, idx) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onQuickReply={handleSend}
            isLastAgent={idx === lastAgentIdx}
            disabled={loading}
            isDemo={isDemoUrl}
          />
        ))}
        {showDemoComplete && (
          <DemoCompleteCard onRestart={() => window.location.reload()} />
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      <ChatInputBar onSend={handleSend} disabled={loading} isDemo={isDemoUrl} />
    </div>
  );
}
