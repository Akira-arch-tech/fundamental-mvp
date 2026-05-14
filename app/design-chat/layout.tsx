import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FUNDAMENTAL — デザインAI",
  description: "AIと話しながら推しグッズをつくろう",
};

export default function DesignChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#B2D8C8]">
      {children}
    </div>
  );
}
