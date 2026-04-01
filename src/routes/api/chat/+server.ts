import { chat } from "$lib/server/claude";
import type { ChatMessage } from "$lib/types";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  if (!messages?.length) {
    return new Response("No messages", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of chat(messages)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const data = `data: ${JSON.stringify({ type: "error", content: message })}\n\n`;
        controller.enqueue(encoder.encode(data));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
