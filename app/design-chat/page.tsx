import { Suspense } from "react";
import DesignChatPage from "@/components/design-chat/DesignChatPage";

function DesignChatFallback() {
  return (
    <div className="flex h-[100dvh] max-w-md mx-auto items-center justify-center bg-[#EEF0F3] text-sm text-gray-500">
      読み込み中…
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<DesignChatFallback />}>
      <DesignChatPage />
    </Suspense>
  );
}
