<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getAiSettings, getHealth, type Health } from "./api";
import { aiDrawerOpen, aiReady } from "./ai-ui";
import AiAssistant from "./components/AiAssistant.vue";

const route = useRoute();
const health = ref<Health | null>(null);
const studio = computed(() => Boolean(route.meta.studio));

const nav = [
  { to: "/", label: "工作台", match: (p: string) => p === "/" },
  { to: "/templates", label: "模板", match: (p: string) => p.startsWith("/templates") },
  { to: "/resume", label: "简历", match: (p: string) => p.startsWith("/resume") },
  { to: "/profile", label: "档案", match: (p: string) => p.startsWith("/profile") },
  { to: "/board", label: "看板", match: (p: string) => p.startsWith("/board") },
  { to: "/settings", label: "设置", match: (p: string) => p.startsWith("/settings") },
];

onMounted(async () => {
  try {
    health.value = await getHealth();
  } catch {
    health.value = null;
  }
  try {
    const settings = await getAiSettings();
    aiReady.value = settings.hasKey;
  } catch {
    aiReady.value = false;
  }
});
</script>

<template>
  <div class="shell" :class="{ studio }">
    <header class="topbar no-print">
      <router-link to="/" class="brand" title="秋招网申助手">
        <b>秋</b>
        <span>秋招网申</span>
      </router-link>
      <nav>
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: item.match(route.path) }"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <div class="top-right">
        <button type="button" class="btn ai" @click="aiDrawerOpen = true">AI 助手</button>
        <div class="pulse" :class="{ ok: health?.ok }" :title="health?.ok ? '本机服务已连接' : '本机服务未连接'" />
      </div>
    </header>
    <main class="stage">
      <router-view />
    </main>
    <AiAssistant />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.shell.studio {
  height: 100vh;
  overflow: hidden;
}
.topbar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid var(--line);
  z-index: 20;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 650;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}
.brand b {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.topbar nav {
  display: flex;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
}
.nav-link {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}
.nav-link.active,
.nav-link:hover {
  color: var(--ink);
  background: var(--chip);
}
.top-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.btn.ai {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent-2);
}
.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}
.pulse.ok {
  background: #22c55e;
}
.stage {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}
.shell.studio .stage {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@media (max-width: 800px) {
  .brand span {
    display: none;
  }
  .topbar {
    height: auto;
    flex-wrap: wrap;
    padding: 8px 10px;
    gap: 6px 8px;
  }
  .topbar nav {
    order: 3;
    flex: 1 0 100%;
  }
  .nav-link {
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>
