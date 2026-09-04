import { createRouter, createWebHistory } from "vue-router";
import ProfileView from "./views/ProfileView.vue";
import ResumeView from "./views/ResumeView.vue";
import BoardView from "./views/BoardView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/profile" },
    { path: "/profile", name: "profile", component: ProfileView, meta: { title: "档案" } },
    { path: "/resume", name: "resume", component: ResumeView, meta: { title: "简历" } },
    { path: "/board", name: "board", component: BoardView, meta: { title: "看板" } },
  ],
});
