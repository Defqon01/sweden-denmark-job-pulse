// @lovable.dev/vite-tanstack-config bundles tanstackStart, viteReact, tailwindcss, nitro, etc.
// base must be the GitHub Pages project subpath so dynamically-imported modules resolve
// (relative './' breaks dynamic imports). SPA mode emits a static client shell.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: { base: "/eu-job-pulse/" },
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true },
  },
});
