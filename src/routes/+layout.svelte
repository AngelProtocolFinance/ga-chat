<script lang="ts">
import type { LayoutProps } from "./$types";
import "../app.css";

let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>{data.app_name}</title>
</svelte:head>

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
