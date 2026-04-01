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
	<button class="new-chat-btn" onclick={on_new}>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<path d="M12 5v14M5 12h14" />
		</svg>
		New Chat
	</button>

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
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
							<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
						</svg>
					</button>
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
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		background: var(--bg-deep);
	}

	.new-chat-btn {
		margin: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--accent-dim);
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		color: var(--accent-hover);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.new-chat-btn:hover {
		background: var(--accent);
		color: var(--text-primary);
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
		transition: background var(--duration-fast) var(--ease-out);
		color: var(--text-secondary);
		border-left: 2px solid transparent;
	}

	.conversation-item:hover {
		background: var(--bg-surface);
	}

	.conversation-item.active {
		background: var(--bg-surface);
		color: var(--text-primary);
		border-left-color: var(--accent);
	}

	.conv-title {
		font-size: var(--text-sm);
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
		font-size: var(--text-xs);
		color: var(--text-dim);
	}

	.delete-btn {
		background: none;
		border: none;
		color: var(--text-dim);
		cursor: pointer;
		padding: 0.125rem;
		line-height: 1;
		opacity: 0;
		transition: opacity var(--duration-fast), color var(--duration-fast);
		display: flex;
		align-items: center;
	}

	.conversation-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: var(--error);
	}

	/* mobile: hidden by default, shown via .open class */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			z-index: 50;
			transform: translateX(-100%);
			transition: transform 0.2s var(--ease-out);
		}

		.sidebar.open {
			transform: translateX(0);
		}
	}
</style>
