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
  {
    to: "/",
    label: "工作台",
    match: (p: string) => p === "/",
    icon: "M4 11 12 4l8 7M6 10.5V20h4v-6h4v6h4v-9.5",
  },
  {
    to: "/profile",
    label: "档案",
    match: (p: string) => p.startsWith("/profile"),
    icon: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM6.5 20a5.5 5.5 0 0 1 11 0",
  },
  {
    to: "/resume",
    label: "简历",
    match: (p: string) => p.startsWith("/resume"),
    icon: "M8 3.5h7l4 4V20.5H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM15 3.5V8h4.5M10 12h6M10 15.5h4",
  },
  {
    to: "/board",
    label: "看板",
    match: (p: string) => p.startsWith("/board"),
    icon: "M4 5h4v14H4zm6 6h4v8h-4zm6-4h4v12h-4z",
  },
  {
    to: "/settings",
    label: "设置",
    match: (p: string) => p.startsWith("/settings"),
    icon: "M12 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.7 5.7l1.7 1.7M16.6 16.6l1.7 1.7M5.7 18.3l1.7-1.7M16.6 7.4l1.7-1.7",
  },
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
    <aside class="rail no-print">
      <router-link to="/" class="mark" title="秋招网申助手">秋</router-link>
      <nav>
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="rail-item"
          :class="{ active: item.match(route.path) }"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </router-link>
      </nav>
      <div class="rail-foot">
        <button type="button" class="rail-item ai" @click="aiDrawerOpen = true">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 3 9 9H3l5 4-2 8 6-5 6 5-2-8 5-4h-6z" />
          </svg>
          助手
        </button>
        <div class="pulse" :class="{ ok: health?.ok }" :title="health?.ok ? '本机服务已连接' : '本机服务未连接'" />
      </div>
    </aside>
    <main class="stage">
      <router-view />
    </main>
    <AiAssistant />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 76px 1fr;
  min-height: 100vh;
  height: 100%;
}
.shell.studio {
  height: 100vh;
  overflow: hidden;
}
.rail {
  background: var(--rail);
  color: var(--rail-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 14px;
  gap: 18px;
  overflow: hidden;
}
.mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}
.rail nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 12px;
  color: var(--rail-text);
  font-size: 11px;
  border: 0;
  background: transparent;
  width: 100%;
  cursor: pointer;
  white-space: nowrap;
}
.rail-item svg {
  width: 20px;
  height: 20px;
  max-width: 20px;
  max-height: 20px;
  flex: none;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.rail-item.active,
.rail-item:hover {
  background: #2a2420;
  color: #fff;
}
.rail-foot {
  margin-top: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.rail-item.ai {
  color: #f3c6b6;
}
.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d15b4b;
}
.pulse.ok {
  background: #7dba6a;
}
.stage {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
}
.shell.studio .stage {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
@media (max-width: 800px) {
  .shell,
  .shell.studio {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }
  .rail {
    flex-direction: row;
    justify-content: flex-start;
    padding: 8px 10px;
    gap: 6px;
    overflow-x: auto;
  }
  .rail nav {
    flex-direction: row;
    width: auto;
    flex: 1;
    min-width: 0;
  }
  .rail-item {
    width: auto;
    min-width: 44px;
    padding: 6px 4px;
  }
  .rail-foot {
    margin-top: 0;
    margin-left: auto;
    flex-direction: row;
    width: auto;
    flex: none;
  }
  .shell.studio .stage {
    overflow: auto;
  }
}
</style>
