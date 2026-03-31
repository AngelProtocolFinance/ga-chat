<script lang="ts">
import type { ChatMessage } from "$lib/types";
import { tick } from "svelte";

let messages = $state<ChatMessage[]>([]);
let input = $state("");
let loading = $state(false);
let status = $state("");
let messages_el: HTMLDivElement;

async function scroll_to_bottom() {
  await tick();
  if (messages_el) {
    messages_el.scrollTop = messages_el.scrollHeight;
  }
}

async function send_message(e: Event) {
  e.preventDefault();
  const text = input.trim();
  if (!text || loading) return;

  input = "";
  messages = [...messages, { role: "user", content: text }];
  loading = true;
  status = "Thinking...";
  await scroll_to_bottom();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) throw new Error("Chat request failed");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistant_text = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const event = JSON.parse(line.slice(6));

        if (event.type === "text") {
          assistant_text += event.content;
          // update message in place
          messages = [
            ...messages.filter(
              (m) => m !== messages[messages.length - 1] || m.role === "user"
            ),
            ...(assistant_text
              ? [{ role: "assistant" as const, content: assistant_text }]
              : []),
          ];
          await scroll_to_bottom();
        } else if (event.type === "tool_call") {
          status = event.content;
        } else if (event.type === "tool_result") {
          status = event.content;
        } else if (event.type === "error") {
          assistant_text += `\n\n**Error:** ${event.content}`;
        }
      }
    }

    if (assistant_text) {
      // ensure final message is set
      const without_assistant = messages.filter(
        (_, i) =>
          i < messages.length - 1 ||
          messages[messages.length - 1].role === "user"
      );
      messages = [
        ...without_assistant,
        { role: "assistant", content: assistant_text },
      ];
    }
  } catch (err) {
    messages = [
      ...messages,
      { role: "assistant", content: "Something went wrong. Please try again." },
    ];
  } finally {
    loading = false;
    status = "";
    await scroll_to_bottom();
  }
}

function has_table(content: string): boolean {
  return /\|.+\|/.test(content) && /\|[\s\-:]+\|/.test(content);
}

async function export_csv(content: string) {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ga4-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// simple markdown rendering
function render_markdown(text: string): string {
  return (
    text
      // code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
      // bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // headers
      .replace(/^### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^## (.+)$/gm, "<h3>$1</h3>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      // tables
      .replace(/^(\|.+\|)$/gm, (match) => {
        if (/^\|[\s\-:|]+\|$/.test(match)) return ""; // skip separator
        const cells = match.split("|").filter((c) => c.trim() !== "");
        const tds = cells.map((c) => `<td>${c.trim()}</td>`).join("");
        return `<tr>${tds}</tr>`;
      })
      .replace(/(<tr>[\s\S]*?<\/tr>)/g, (match, _, offset, str) => {
        // wrap consecutive rows in a table
        if (offset === 0 || str[offset - 1] !== ">") {
          // find all consecutive rows
          const rest = str.slice(offset);
          const rows_match = rest.match(/^(<tr>[\s\S]*?<\/tr>\s*)+/);
          if (rows_match) {
            const rows = rows_match[0];
            const first_row = rows.match(/<tr>(.*?)<\/tr>/);
            if (first_row) {
              const header = first_row[0]
                .replace(/<td>/g, "<th>")
                .replace(/<\/td>/g, "</th>");
              const body = rows.replace(first_row[0], "").trim();
              return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
            }
          }
        }
        return match;
      })
      // line breaks
      .replace(/\n/g, "<br>")
  );
}
</script>

<div class="chat-app">
  <header>
    <h1>GA4 Chat</h1>
    <span class="badge">Better Giving Analytics</span>
  </header>

  <div class="messages" bind:this={messages_el}>
    {#if messages.length === 0}
      <div class="empty">
        <p class="empty-title">Ask anything about your GA4 data</p>
        <div class="suggestions">
          <button onclick={() => { input = "How many visitors did we get last 7 days?"; }}>
            Visitors last 7 days
          </button>
          <button onclick={() => { input = "What are our top traffic sources this month?"; }}>
            Top traffic sources
          </button>
          <button onclick={() => { input = "Show me the most popular pages this week"; }}>
            Most popular pages
          </button>
          <button onclick={() => { input = "How many active users right now?"; }}>
            Real-time active users
          </button>
        </div>
      </div>
    {/if}

    {#each messages as msg}
      <div class="message {msg.role}">
        <div class="message-label">{msg.role === "user" ? "You" : "GA4 Assistant"}</div>
        <div class="message-content">
          {#if msg.role === "assistant"}
            {@html render_markdown(msg.content)}
            {#if has_table(msg.content)}
              <button class="export-btn" onclick={() => export_csv(msg.content)}>
                Export CSV
              </button>
            {/if}
          {:else}
            {msg.content}
          {/if}
        </div>
      </div>
    {/each}

    {#if loading}
      <div class="message assistant">
        <div class="message-label">GA4 Assistant</div>
        <div class="message-content loading-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          {#if status}
            <span class="status-text">{status}</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <form class="input-area" onsubmit={send_message}>
    <input
      type="text"
      bind:value={input}
      placeholder="Ask about your GA4 data..."
      disabled={loading}
    />
    <button type="submit" disabled={loading || !input.trim()}>Send</button>
  </form>
</div>

<style>
  .chat-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 800px;
    margin: 0 auto;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #1a1a1a;
  }

  header h1 {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .badge {
    font-size: 0.6875rem;
    color: #a3a3a3;
    background: #1a1a1a;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1.5rem;
  }

  .empty-title {
    color: #737373;
    font-size: 1.125rem;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .suggestions button {
    background: #141414;
    border: 1px solid #262626;
    border-radius: 8px;
    color: #a3a3a3;
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .suggestions button:hover {
    background: #1a1a1a;
    border-color: #404040;
    color: #fafafa;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .message-label {
    font-size: 0.6875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #525252;
  }

  .message-content {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: #e5e5e5;
  }

  .message.user .message-content {
    color: #fafafa;
  }

  /* markdown content styling */
  .message-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0;
    font-size: 0.8125rem;
  }

  .message-content :global(th),
  .message-content :global(td) {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #1a1a1a;
  }

  .message-content :global(th) {
    color: #a3a3a3;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message-content :global(tr:hover td) {
    background: #141414;
  }

  .message-content :global(pre) {
    background: #141414;
    border-radius: 6px;
    padding: 0.75rem;
    overflow-x: auto;
    font-size: 0.8125rem;
  }

  .message-content :global(strong) {
    color: #fafafa;
  }

  .message-content :global(h2),
  .message-content :global(h3),
  .message-content :global(h4) {
    margin-top: 0.75rem;
    color: #fafafa;
  }

  .export-btn {
    background: #141414;
    border: 1px solid #262626;
    border-radius: 6px;
    color: #a3a3a3;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: all 0.15s;
  }

  .export-btn:hover {
    background: #1a1a1a;
    color: #fafafa;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #525252;
    border-radius: 50%;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }

  .status-text {
    color: #525252;
    font-size: 0.8125rem;
    margin-left: 0.5rem;
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #1a1a1a;
  }

  .input-area input {
    flex: 1;
    background: #141414;
    border: 1px solid #262626;
    border-radius: 8px;
    color: #fafafa;
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .input-area input:focus {
    border-color: #525252;
  }

  .input-area button {
    background: #fafafa;
    color: #0a0a0a;
    border: none;
    border-radius: 8px;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .input-area button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input-area button:hover:not(:disabled) {
    opacity: 0.9;
  }
</style>
