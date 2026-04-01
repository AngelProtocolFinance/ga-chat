<script lang="ts">
import type { ChatMessage, Conversation } from "$lib/types";
import Sidebar from "$lib/components/sidebar.svelte";
import { tick, onMount } from "svelte";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Menu, Users, Globe, FileText, Activity, Download, Send, Settings, ChevronDown } from "lucide-svelte";

marked.setOptions({ async: false });

let messages = $state<ChatMessage[]>([]);
let input = $state("");
let loading = $state(false);
let status = $state("");
let messages_el: HTMLDivElement;

let conversations = $state<Conversation[]>([]);
let conversation_id = $state<string | null>(null);
let sidebar_open = $state(false);

let config_open = $state(false);
let config: {
	ga4_property_id: string | null;
	anthropic_key: string | null;
	service_account_email: string | null;
	service_account_project: string | null;
} | null = $state(null);

onMount(() => {
	load_conversations();
	fetch("/api/config")
		.then((r) => (r.ok ? r.json() : null))
		.then((data) => (config = data))
		.catch(() => {});
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
			<Menu size={18} />
		</button>
		<h1>GA4 Chat</h1>
		<span class="badge">GA4 Analytics</span>
	</header>

	<div class="messages" bind:this={messages_el}>
		{#if messages.length === 0}
			<div class="empty">
				<div class="empty-hero">
					<svg class="empty-icon" width="48" height="48" viewBox="0 0 32 32" fill="none">
						<rect x="6" y="18" width="5" height="8" rx="1.5" fill="var(--accent)" opacity="0.6"/>
						<rect x="13.5" y="12" width="5" height="14" rx="1.5" fill="var(--accent)" opacity="0.8"/>
						<rect x="21" y="6" width="5" height="20" rx="1.5" fill="var(--accent)"/>
					</svg>
					<p class="empty-title">Ask anything about your GA4 data</p>
					<p class="empty-hint">Query visitors, traffic sources, page views, and more</p>
				</div>
				<div class="suggestions">
					<button onclick={() => { input = "How many visitors did we get last 7 days?"; }}>
						<Users size={14} />
						Visitors last 7 days
					</button>
					<button onclick={() => { input = "What are our top traffic sources this month?"; }}>
						<Globe size={14} />
						Top traffic sources
					</button>
					<button onclick={() => { input = "Show me the most popular pages this week"; }}>
						<FileText size={14} />
						Most popular pages
					</button>
					<button onclick={() => { input = "How many active users right now?"; }}>
						<Activity size={14} />
						Real-time active users
					</button>
				</div>

				{#if config}
					<div class="config-panel">
						<button class="config-toggle" onclick={() => config_open = !config_open}>
							<Settings size={14} />
							Setup Status
							<span class="config-chevron" class:config-chevron-open={config_open}>
								<ChevronDown size={12} />
							</span>
						</button>
						{#if config_open}
							<div class="config-grid">
								<div class="config-row">
									<span class="config-label">GA4 Property</span>
									<span class="config-value">
										{#if config.ga4_property_id}
											<span class="config-ok">&#10003;</span> {config.ga4_property_id}
										{:else}
											<span class="config-err">&#10007;</span> not set
										{/if}
									</span>
								</div>
								<div class="config-row">
									<span class="config-label">Anthropic Key</span>
									<span class="config-value">
										{#if config.anthropic_key}
											<span class="config-ok">&#10003;</span> {config.anthropic_key}
										{:else}
											<span class="config-err">&#10007;</span> not set
										{/if}
									</span>
								</div>
								<div class="config-row">
									<span class="config-label">Service Account</span>
									<span class="config-value">
										{#if config.service_account_email}
											<span class="config-ok">&#10003;</span> {config.service_account_email}
											{#if config.service_account_project}
												<span class="config-project">({config.service_account_project})</span>
											{/if}
										{:else}
											<span class="config-err">&#10007;</span> not set
										{/if}
									</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#each messages as msg, i}
			<div class="message {msg.role}" style="animation-delay: {Math.min(i * 0.05, 0.3)}s">
				<div class="message-label">{msg.role === "user" ? "You" : "GA4 Assistant"}</div>
				<div class="message-content">
					{#if msg.role === "assistant"}
						{@html render_markdown(strip_suggestions(msg.content))}
						{#if has_table(msg.content)}
							<button class="export-btn" onclick={() => export_csv(msg.content)}>
								<Download size={12} />
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
		<button type="submit" disabled={loading || !input.trim()}>
			<Send size={16} />
			Send
		</button>
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
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-deep);
	}

	header h1 {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.menu-btn {
		display: none;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}

	.menu-btn:hover {
		color: var(--text-primary);
	}

	.badge {
		font-size: var(--text-xs);
		color: var(--accent);
		background: var(--accent-dim);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-weight: 500;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* empty state */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 2rem;
	}

	.empty-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.empty-icon {
		margin-bottom: 0.5rem;
		opacity: 0;
		animation: fade-up var(--duration-slow) var(--ease-out) 0.1s forwards;
	}

	.empty-title {
		color: var(--text-primary);
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 600;
		letter-spacing: -0.02em;
		opacity: 0;
		animation: fade-up var(--duration-slow) var(--ease-out) 0.2s forwards;
	}

	.empty-hint {
		color: var(--text-muted);
		font-size: var(--text-base);
		opacity: 0;
		animation: fade-up var(--duration-slow) var(--ease-out) 0.3s forwards;
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.suggestions {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
		max-width: 480px;
		width: 100%;
	}

	.follow-up-suggestions {
		display: flex;
		flex-wrap: wrap;
		max-width: none;
		margin-top: 0.75rem;
	}

	.suggestions button {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		padding: 0.625rem 0.875rem;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
		text-align: left;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.suggestions button:hover {
		background: var(--bg-elevated);
		border-color: var(--border-default);
		color: var(--text-primary);
		transform: translateY(-1px);
	}

	.suggestions button:active {
		transform: translateY(0);
	}

	/* stagger suggestion entrance */
	.empty .suggestions button {
		opacity: 0;
		animation: fade-up var(--duration-slow) var(--ease-out) forwards;
	}
	.empty .suggestions button:nth-child(1) { animation-delay: 0.35s; }
	.empty .suggestions button:nth-child(2) { animation-delay: 0.4s; }
	.empty .suggestions button:nth-child(3) { animation-delay: 0.45s; }
	.empty .suggestions button:nth-child(4) { animation-delay: 0.5s; }

	/* messages */
	.message {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
		animation: message-in var(--duration-normal) var(--ease-out) both;
	}

	.message.assistant {
		padding-left: 0.75rem;
		border-left: 2px solid var(--accent-dim);
	}

	.message-label {
		font-size: var(--text-xs);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-dim);
	}

	.message.assistant .message-label {
		color: var(--accent);
	}

	.message-content {
		font-size: var(--text-md);
		line-height: 1.6;
		color: var(--text-secondary);
		overflow-x: auto;
		min-width: 0;
	}

	.message.user .message-content {
		color: var(--text-primary);
	}

	/* markdown content styling */
	.message-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75rem 0;
		font-size: var(--text-sm);
	}

	.message-content :global(th),
	.message-content :global(td) {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border-subtle);
	}

	.message-content :global(th) {
		color: var(--text-secondary);
		font-weight: 500;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.message-content :global(tr:hover td) {
		background: var(--bg-surface);
	}

	.message-content :global(pre) {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	.message-content :global(code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	.message-content :global(strong) {
		color: var(--text-primary);
	}

	.message-content :global(h2),
	.message-content :global(h3),
	.message-content :global(h4) {
		margin-top: 0.75rem;
		color: var(--text-primary);
		font-family: var(--font-display);
	}

	.export-btn {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		padding: 0.375rem 0.75rem;
		font-family: var(--font-body);
		font-size: 0.75rem;
		cursor: pointer;
		margin-top: 0.5rem;
		transition: all var(--duration-fast);
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.export-btn:hover {
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	/* loading dots */
	.loading-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		background: var(--accent);
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
		color: var(--text-dim);
		font-size: var(--text-sm);
		margin-left: 0.5rem;
	}

	/* input area */
	.input-area {
		display: flex;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-deep);
	}

	.input-area input {
		flex: 1;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		padding: 0.625rem 0.875rem;
		font-family: var(--font-body);
		font-size: var(--text-base);
		outline: none;
		transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
	}

	.input-area input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.input-area button {
		background: var(--accent);
		color: var(--bg-deepest);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.625rem 1.25rem;
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 600;
		cursor: pointer;
		transition: background var(--duration-fast), transform var(--duration-fast);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.input-area button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-area button:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.input-area button:active:not(:disabled) {
		transform: scale(0.97);
	}

	.sidebar-overlay {
		display: none;
	}

	/* config panel */
	.config-panel {
		max-width: 480px;
		width: 100%;
		opacity: 0;
		animation: fade-up var(--duration-slow) var(--ease-out) 0.55s forwards;
	}

	.config-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: none;
		color: var(--text-dim);
		font-family: var(--font-body);
		font-size: var(--text-xs);
		cursor: pointer;
		padding: 0.25rem 0;
		transition: color var(--duration-fast);
	}

	.config-toggle:hover {
		color: var(--text-secondary);
	}

	.config-chevron {
		display: inline-flex;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.config-chevron-open {
		transform: rotate(180deg);
	}

	.config-grid {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		margin-top: 0.375rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.config-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		font-size: var(--text-xs);
	}

	.config-label {
		color: var(--text-dim);
		white-space: nowrap;
	}

	.config-value {
		color: var(--text-secondary);
		text-align: right;
		word-break: break-all;
	}

	.config-ok {
		color: #34d399;
	}

	.config-err {
		color: #f87171;
	}

	.config-project {
		color: var(--text-dim);
		margin-left: 0.25rem;
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

		.suggestions {
			grid-template-columns: 1fr;
		}
	}
</style>
