import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

const root = dirname(fileURLToPath(import.meta.url));

async function bundlePrefillInject() {
  const esbuild = await import("esbuild");
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [join(root, "src/prefill-inject.ts")],
    bundle: true,
    format: "iife",
    outfile: join(root, "public/prefill-inject.js"),
    platform: "browser",
    target: "es2020",
    banner: { js: "/* generated from src/prefill-inject.ts - do not edit */" },
    logLevel: "silent",
  });
}

function prefillInjectPlugin(): Plugin {
  return {
    name: "prefill-inject",
    async buildStart() {
      await bundlePrefillInject();
    },
    configureServer(server) {
      void bundlePrefillInject();
      server.watcher.add(join(root, "src/prefill-inject.ts"));
      server.watcher.on("change", (file) => {
        const norm = file.replace(/\\/g, "/");
        if (norm.endsWith("prefill-inject.ts") || norm.includes("/packages/fill/")) {
          void bundlePrefillInject();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), prefillInjectPlugin()],
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
