<script lang="ts">
import type { ChatMessage, Conversation } from "$lib/types";
import Sidebar from "$lib/components/sidebar.svelte";
import { tick, onMount } from "svelte";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ async: false });

let messages = $state<ChatMessage[]>([]);
let input = $state("");
let loading = $state(false);
let status = $state("");
let messages_el: HTMLDivElement;

let conversations = $state<Conversation[]>([]);
let conversation_id = $state<string | null>(null);
let sidebar_open = $state(false);

onMount(() => {
	load_conversations();
});

async function load_conversations() {
	const res = await fetch("/api/conversations");
	if (res.ok) conversations = await res.json();
}

async function select_conversation(id: string) {
	conversation_id = id;
	sidebar_open = false;
	const res = await fetch(`/api/conversations/${id}`);
	if (res.ok) {
		const rows = await res.json();
		messages = rows.map((r: { role: string; content: string }) => ({
			role: r.role as "user" | "assistant",
			content: r.content,
		}));
		await scroll_to_bottom();
	}
}

function new_conversation() {
	conversation_id = null;
	messages = [];
	sidebar_open = false;
}

async function delete_conversation(id: string) {
	await fetch(`/api/conversations/${id}`, { method: "DELETE" });
	conversations = conversations.filter((c) => c.id !== id);
	if (conversation_id === id) {
		conversation_id = null;
		messages = [];
	}
}

async function scroll_to_bottom() {
	await tick();
	if (messages_el) {
		messages_el.scrollTop = messages_el.scrollHeight;
	}
}

const SUGGESTIONS_RE = /<suggestions>\n?([\s\S]*?)\n?<\/suggestions>\s*$/;

function parse_suggestions(content: string): string[] {
	const match = content.match(SUGGESTIONS_RE);
	if (!match) return [];
	return match[1].split("\n").map(s => s.trim()).filter(Boolean);
}

function strip_suggestions(content: string): string {
	// complete block
	let result = content.replace(SUGGESTIONS_RE, "").trimEnd();
	// partial block during streaming
	result = result.replace(/<suggestions>[\s\S]*$/, "").trimEnd();
	return result;
}

async function send_message(e?: Event, override_text?: string) {
	e?.preventDefault();
	const text = (override_text ?? input).trim();
	if (!text || loading) return;

	input = "";
	messages = [...messages, { role: "user", content: text }];
	loading = true;
	status = "Thinking...";
	await scroll_to_bottom();

	// create conversation if new
	let current_conv_id = conversation_id;
	if (!current_conv_id) {
		const title = text.length > 80 ? text.slice(0, 80) + "…" : text;
		const res = await fetch("/api/conversations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title }),
		});
		if (res.ok) {
			const conv = await res.json();
			current_conv_id = conv.id;
			conversation_id = conv.id;
		}
	}

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

		// pre-allocate assistant message at known index
		const assistant_idx = messages.length;
		messages = [...messages, { role: "assistant", content: "" }];

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
					// update content via index assignment
					messages[assistant_idx] = { role: "assistant", content: assistant_text };
					messages = messages;
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

		// finalize assistant message
		messages[assistant_idx] = { role: "assistant", content: assistant_text };
		messages = messages;

		// persist user + assistant messages
		if (current_conv_id) {
			await fetch(`/api/conversations/${current_conv_id}/messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [
						{ role: "user", content: text },
						{ role: "assistant", content: assistant_text },
					],
				}),
			});
			await load_conversations();
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

function render_markdown(text: string): string {
	const html = marked.parse(text) as string;
	return DOMPurify.sanitize(html);
}
</script>

<Sidebar
	{conversations}
	active_id={conversation_id}
	open={sidebar_open}
	on_select={select_conversation}
	on_new={new_conversation}
	on_delete={delete_conversation}
/>

{#if sidebar_open}
	<!-- mobile overlay -->
	<button class="sidebar-overlay" onclick={() => sidebar_open = false} aria-label="Close sidebar"></button>
{/if}

<div class="chat-app" class:sidebar-open={sidebar_open}>
	<header>
		<button class="menu-btn" onclick={() => sidebar_open = !sidebar_open} aria-label="Toggle sidebar">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12h18M3 6h18M3 18h18" />
			</svg>
		</button>
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
						{@html render_markdown(strip_suggestions(msg.content))}
						{#if has_table(msg.content)}
							<button class="export-btn" onclick={() => export_csv(msg.content)}>
								Export CSV
							</button>
						{/if}
						{#if !loading && parse_suggestions(msg.content).length > 0 && messages.indexOf(msg) === messages.length - 1}
							<div class="suggestions follow-up-suggestions">
								{#each parse_suggestions(msg.content) as suggestion}
									<button onclick={() => send_message(undefined, suggestion)}>{suggestion}</button>
								{/each}
							</div>
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
		flex: 1;
		min-width: 0;
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

	.menu-btn {
		display: none;
		background: none;
		border: none;
		color: #a3a3a3;
		cursor: pointer;
		padding: 0.25rem;
	}

	.menu-btn:hover {
		color: #fafafa;
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

	.follow-up-suggestions {
		justify-content: flex-start;
		margin-top: 0.75rem;
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

	.sidebar-overlay {
		display: none;
	}

	@media (max-width: 768px) {
		.menu-btn {
			display: block;
		}

		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 40;
			border: none;
			cursor: default;
		}
	}
</style>
