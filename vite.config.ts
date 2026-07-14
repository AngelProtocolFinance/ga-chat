import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { strictPort: true },
  plugins: [sveltekit()],
});
