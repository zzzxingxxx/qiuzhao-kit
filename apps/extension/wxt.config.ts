import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  srcDir: "src",
  manifest: {
    name: "秋招网申助手",
    description: "本机档案预填校招网申，不自动提交。",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: ["http://127.0.0.1:8787/*"],
  },
});
