import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import TemplatesView from "./views/TemplatesView.vue";
import ProfileView from "./views/ProfileView.vue";
import ResumeView from "./views/ResumeView.vue";
import BoardView from "./views/BoardView.vue";
import SettingsView from "./views/SettingsView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView, meta: { title: "工作台" } },
    { path: "/templates", name: "templates", component: TemplatesView, meta: { title: "模板" } },
    { path: "/profile", name: "profile", component: ProfileView, meta: { title: "档案" } },
    { path: "/resume", name: "resume", component: ResumeView, meta: { title: "简历", studio: true } },
    { path: "/board", name: "board", component: BoardView, meta: { title: "看板" } },
    { path: "/settings", name: "settings", component: SettingsView, meta: { title: "设置" } },
  ],
});

router.afterEach((to) => {
  const title = typeof to.meta.title === "string" ? to.meta.title : "秋招";
  document.title = `${title} · 秋招网申助手`;
});
