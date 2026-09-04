import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import ProfileView from "./views/ProfileView.vue";
import ResumeView from "./views/ResumeView.vue";
import BoardView from "./views/BoardView.vue";
import SettingsView from "./views/SettingsView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { title: "工作台", hint: "本机优先的校招工作台：档案、完整模板简历、AI 助手、投递看板。" },
    },
    {
      path: "/profile",
      name: "profile",
      component: ProfileView,
      meta: { title: "档案", hint: "身份与教育是网申主档。实习和项目写在简历里，不回写档案。" },
    },
    {
      path: "/resume",
      name: "resume",
      component: ResumeView,
      meta: { title: "简历", hint: "先选完整模板，再把示例改成你自己的经历。右侧可开 AI 助手润色。" },
    },
    {
      path: "/board",
      name: "board",
      component: BoardView,
      meta: { title: "看板", hint: "预填不等于代投。提交按钮永远由你亲手点。" },
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
      meta: { title: "设置", hint: "AI 助手使用 OpenAI 兼容接口。密钥只存在本机 SQLite，不会进前端打包。" },
    },
  ],
});
