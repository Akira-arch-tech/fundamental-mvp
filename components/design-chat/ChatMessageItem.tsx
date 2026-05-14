"use client";

import type { ChatMessage, QuickReply } from "@/lib/design-agent/types";
import TypingIndicator from "./TypingIndicator";
import QuickReplies from "./QuickReplies";
import ProductMockupCard from "./ProductMockupCard";
import OrderConfirmCard from "./OrderConfirmCard";

interface Props {
  message: ChatMessage;
  onQuickReply: (value: string) => void;
  isLastAgent?: boolean;
  disabled?: boolean;
}

export default function ChatMessageItem({ message, onQuickReply, isLastAgent, disabled }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-1.5">
        <span className="text-[10px] text-gray-400 mb-0.5 self-end">
          {formatTime(message.timestamp)}
        </span>
        <div className="max-w-[72%]">
          <div className="bg-[#06C755] text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Agent message
  return (
    <div className="flex items-start gap-2 max-w-[88%]">
      {/* Bot avatar */}
      <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
        <span className="text-white font-bold text-xs">F</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[11px] text-gray-500 font-medium px-1">FUNDAMENTAL AI</span>

        {/* Typing indicator */}
        {message.isTyping && !message.content && !message.isGenerating && (
          <TypingIndicator />
        )}

        {/* Text bubble */}
        {message.content && (
          <div className="bg-white text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Generating spinner */}
        {message.isGenerating && (
          <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-gray-500">AIが生成中...</span>
          </div>
        )}

        {/* Generated image */}
        {message.designUrl && (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.designUrl}
              alt="生成されたデザイン"
              className="w-full object-cover"
              style={{ maxHeight: 280 }}
            />
            <div className="px-3 py-1.5 bg-[#F0FDF4] flex items-center gap-1.5">
              <span className="text-[#06C755] text-xs">✨</span>
              <span className="text-xs text-gray-500">AIが生成したデザイン</span>
            </div>
          </div>
        )}

        {/* Product mockup */}
        {message.mockupData && <ProductMockupCard data={message.mockupData} />}

        {/* Order confirmation */}
        {message.orderData && <OrderConfirmCard data={message.orderData} />}

        {/* Timestamp */}
        {!message.isTyping && (
          <span className="text-[10px] text-gray-400 px-1">{formatTime(message.timestamp)}</span>
        )}

        {/* Quick replies — only on last agent message */}
        {message.quickReplies && message.quickReplies.length > 0 && isLastAgent && (
          <QuickReplies
            items={message.quickReplies}
            onSelect={onQuickReply}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
