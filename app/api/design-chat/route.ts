import type { NextRequest } from "next/server";
import { runAgent } from "@/lib/design-agent/agent";
import type { AgentState, SSEEvent } from "@/lib/design-agent/types";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { message: string; state: AgentState };
  const { message, state } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for await (const event of runAgent(message, state)) {
          send(event);
        }
      } catch {
        send({ type: "error", message: "エラーが発生しました。もう一度お試しください。" });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
