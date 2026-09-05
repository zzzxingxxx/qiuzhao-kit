<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createCompleteSampleResume,
  getResumeTemplate,
  isProfileComplete,
  RESUME_TEMPLATES,
  type Profile,
  type Resume,
} from "@qiuzhao/schema";
import { getAiSettings, listApplications, listProfiles, listResumes, pickPrimaryProfile } from "../api";
import { aiDrawerOpen, aiReady } from "../ai-ui";
import LaunchExtButton from "../components/LaunchExtButton.vue";
import ResumePaper from "../components/ResumePaper.vue";

const router = useRouter();
const loading = ref(true);
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const appCount = ref(0);

const featured = RESUME_TEMPLATES.filter((tpl) =>
  ["campus-tech", "campus-classic", "campus-banner", "campus-sidebar"].includes(tpl.id),
).map((tpl) => ({ tpl, sample: createCompleteSampleResume(tpl.id) }));

const profileState = computed(() => {
  if (!profile.value) return "未创建";
  return isProfileComplete(profile.value) ? "已完整" : "待补全";
});

onMounted(async () => {
  loading.value = true;
  try {
    const [profiles, apps, settings] = await Promise.all([
      listProfiles(),
      listApplications().catch(() => ({ items: [] })),
      getAiSettings().catch(() => null),
    ]);
    profile.value = pickPrimaryProfile(profiles.items);
    appCount.value = apps.items.length;
    if (settings) aiReady.value = settings.hasKey;
    if (profile.value) {
      const owned = await listResumes(profile.value.id);
      resume.value = owned.items[0] ?? null;
      if (!resume.value) {
        const all = await listResumes();
        const found = all.items[0];
        if (found) {
          resume.value = found;
          profile.value = profiles.items.find((item) => item.id === found.profileId) ?? profile.value;
        }
      }
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-loading="loading" class="page">
    <section class="hero surface">
      <div class="copy">
        <p class="kicker">本机优先 · 一页纸 · 人手提交</p>
        <h1>做一页能过筛选的校招简历</h1>
        <p class="sub">
          先选模板拿到对应方向的完整范文（后端、算法、管培、审计、产品、运营、前端、数据分析），再把公司名和数字改成你自己的。档案管身份和教育，实习和项目只写在简历里。
        </p>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" @click="router.push('/templates')">浏览完整模板</button>
          <button type="button" class="btn" @click="router.push('/resume')">打开简历工作室</button>
          <button type="button" class="btn" @click="aiDrawerOpen = true">AI 润色</button>
          <LaunchExtButton label="打开预填浏览器" />
        </div>
        <ul class="facts">
          <li><b>{{ profileState }}</b><span>档案</span></li>
          <li><b>{{ resume ? getResumeTemplate(resume.templateId).name : "—" }}</b><span>当前模板</span></li>
          <li><b>{{ resume ? `v${resume.version}` : "—" }}</b><span>版本</span></li>
          <li><b>{{ aiReady ? "已配置" : "未配置" }}</b><span>AI</span></li>
        </ul>
      </div>
      <div class="desk">
        <div v-if="resume" class="mini">
          <div class="mini-inner">
            <div class="mini-scale">
              <ResumePaper :resume="resume" />
            </div>
          </div>
        </div>
        <div v-else class="desk-empty">选一套模板后，这里出现你的一页纸</div>
      </div>
    </section>

    <section class="picks">
      <header>
        <h2>四套常用纸样</h2>
        <button type="button" class="btn btn-ghost" @click="router.push('/templates')">全部 8 套</button>
      </header>
      <div class="pick-grid">
        <button
          v-for="item in featured"
          :key="item.tpl.id"
          type="button"
          class="surface pick"
          @click="router.push('/templates')"
        >
          <div class="pick-mini">
            <div class="pick-inner">
              <div class="pick-scale">
                <ResumePaper :resume="item.sample" />
              </div>
            </div>
          </div>
          <strong>{{ item.tpl.name }}</strong>
          <em>{{ item.tpl.audience }}</em>
          <p>{{ item.tpl.description }}</p>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(280px, 420px);
  min-height: 440px;
  overflow: hidden;
}
.copy {
  padding: 40px 36px 32px;
}
.kicker {
  margin: 0 0 10px;
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.14em;
  font-weight: 600;
}
.copy h1 {
  margin: 0 0 12px;
  font-size: 34px;
  letter-spacing: -0.04em;
  line-height: 1.2;
}
.sub {
  margin: 0 0 22px;
  color: var(--muted);
  line-height: 1.65;
  font-size: 14px;
}
.facts {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  margin: 28px 0 0;
}
.facts li {
  background: var(--chip);
  border-radius: 10px;
  padding: 10px 12px;
}
.facts b {
  display: block;
  font-size: 14px;
}
.facts span {
  color: var(--muted);
  font-size: 12px;
}
.desk {
  background: var(--desk);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.desk-empty {
  color: var(--muted);
  font-size: 13px;
}
.mini {
  width: calc(210mm * 0.38);
  height: calc(297mm * 0.38);
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  background: #fff;
}
.mini-inner,
.mini-scale {
  width: 210mm;
}
.mini-scale {
  transform: scale(0.38);
  transform-origin: top left;
}
.picks {
  margin-top: 28px;
}
.picks header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.picks h2 {
  margin: 0;
  font-size: 16px;
}
.pick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.pick {
  text-align: left;
  padding: 10px 10px 14px;
  cursor: pointer;
  color: inherit;
  border: 1px solid var(--line);
}
.pick:hover {
  border-color: var(--accent);
}
.pick-mini {
  height: 220px;
  overflow: hidden;
  background: var(--desk);
  border-radius: 8px;
  pointer-events: none;
  display: flex;
  justify-content: center;
  padding-top: 8px;
  margin-bottom: 10px;
}
.pick-inner {
  width: calc(210mm * 0.28);
  height: calc(297mm * 0.28);
  overflow: hidden;
}
.pick-scale {
  transform: scale(0.28);
  transform-origin: top left;
  width: 210mm;
}
.pick strong {
  display: block;
  font-size: 15px;
  padding: 0 6px;
}
.pick em {
  display: block;
  font-style: normal;
  color: var(--accent);
  font-size: 12px;
  margin: 4px 6px 8px;
}
.pick p {
  margin: 0 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 980px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .facts,
  .pick-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
