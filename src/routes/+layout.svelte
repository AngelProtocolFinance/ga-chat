<script lang="ts">
import type { Snippet } from "svelte";
import "../app.css";

let { children }: { children: Snippet } = $props();
</script>

<div class="app-layout">
	{@render children()}
</div>

<style>
	.app-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}
</style>
