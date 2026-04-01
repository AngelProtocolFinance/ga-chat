<script lang="ts">
import type { Conversation } from "$lib/types";

let {
	conversations,
	active_id,
	open,
	on_select,
	on_new,
	on_delete,
}: {
	conversations: Conversation[];
	active_id: string | null;
	open: boolean;
	on_select: (id: string) => void;
	on_new: () => void;
	on_delete: (id: string) => void;
} = $props();

function relative_time(date_str: string): string {
	const diff = Date.now() - new Date(date_str).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function handle_delete(e: Event, id: string) {
	e.stopPropagation();
	on_delete(id);
}
</script>

<aside class="sidebar" class:open>
	<button class="new-chat-btn" onclick={on_new}>+ New Chat</button>

	<div class="conversation-list">
		{#each conversations as conv (conv.id)}
			<!-- biome-ignore lint: using div with onclick for nested button support -->
			<div
				class="conversation-item"
				class:active={conv.id === active_id}
				onclick={() => on_select(conv.id)}
				role="button"
				tabindex="0"
				onkeydown={(e) => { if (e.key === "Enter") on_select(conv.id); }}
			>
				<span class="conv-title">{conv.title}</span>
				<span class="conv-meta">
					<span class="conv-time">{relative_time(conv.updated_at)}</span>
					<button
						class="delete-btn"
						onclick={(e) => handle_delete(e, conv.id)}
						aria-label="Delete conversation"
					>×</button>
				</span>
			</div>
		{/each}
	</div>
</aside>

<style>
	.sidebar {
		width: 260px;
		min-width: 260px;
		height: 100vh;
		border-right: 1px solid #1a1a1a;
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
	}

	.new-chat-btn {
		margin: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: #141414;
		border: 1px solid #262626;
		border-radius: 8px;
		color: #fafafa;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.new-chat-btn:hover {
		background: #1a1a1a;
	}

	.conversation-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.conversation-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.625rem 0.75rem;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
		color: #a3a3a3;
	}

	.conversation-item:hover {
		background: #141414;
	}

	.conversation-item.active {
		background: #1a1a1a;
		color: #fafafa;
	}

	.conv-title {
		font-size: 0.8125rem;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.conv-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.conv-time {
		font-size: 0.6875rem;
		color: #525252;
	}

	.delete-btn {
		background: none;
		border: none;
		color: #525252;
		font-size: 1rem;
		cursor: pointer;
		padding: 0 0.25rem;
		line-height: 1;
		opacity: 0;
		transition: opacity 0.15s, color 0.15s;
	}

	.conversation-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: #ef4444;
	}

	/* mobile: hidden by default, shown via .open class */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}

		.sidebar.open {
			transform: translateX(0);
		}
	}
</style>
