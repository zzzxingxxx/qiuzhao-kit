<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { RESUME_TEMPLATES, isProfileComplete, type Profile, type Resume } from "@qiuzhao/schema";
import { getAiSettings, listApplications, listProfiles, listResumes } from "../api";
import { aiDrawerOpen, aiReady } from "../ai-ui";

const router = useRouter();
const loading = ref(true);
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const appCount = ref(0);

onMounted(async () => {
  loading.value = true;
  try {
    const [profiles, apps, settings] = await Promise.all([
      listProfiles(),
      listApplications().catch(() => ({ items: [] })),
      getAiSettings().catch(() => null),
    ]);
    profile.value = profiles.items[0] ?? null;
    appCount.value = apps.items.length;
    if (settings) aiReady.value = settings.hasKey;
    if (profile.value) {
      const resumes = await listResumes(profile.value.id);
      resume.value = resumes.items[0] ?? null;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-loading="loading" class="home">
    <section class="hero page-card">
      <div>
        <p class="kicker">本机优先</p>
        <h2>把档案、一页纸和投递收在同一台电脑上</h2>
        <p class="sub">
          八套完整校招模板可直接套用。AI 助手走你自己的 URL 和 Key，默认 SpaceXAI。提交永远由你亲手点。
        </p>
        <div class="hero-actions">
          <el-button type="primary" @click="router.push('/resume')">打开简历编辑器</el-button>
          <el-button @click="router.push('/profile')">完善档案</el-button>
          <el-button @click="aiDrawerOpen = true">打开 AI 助手</el-button>
        </div>
      </div>
    </section>

    <section class="stats">
      <button class="stat page-card" type="button" @click="router.push('/profile')">
        <span>档案</span>
        <strong>{{ profile ? (isProfileComplete(profile) ? "已完整" : "待补全") : "未创建" }}</strong>
        <em>{{ profile?.name || "去填写姓名 / 手机 / 学校" }}</em>
      </button>
      <button class="stat page-card" type="button" @click="router.push('/resume')">
        <span>简历</span>
        <strong>{{ resume ? `v${resume.version}` : "未生成" }}</strong>
        <em>{{ resume ? resume.targetRole : "选一套完整模板开始" }}</em>
      </button>
      <button class="stat page-card" type="button" @click="router.push('/board')">
        <span>看板</span>
        <strong>{{ appCount }} 条</strong>
        <em>预填不等于代投</em>
      </button>
      <button class="stat page-card" type="button" @click="router.push('/settings')">
        <span>AI 助手</span>
        <strong>{{ aiReady ? "已配置" : "未配置" }}</strong>
        <em>自定义 URL / Key，自动拉模型</em>
      </button>
    </section>

    <section class="page-card">
      <div class="row-head">
        <strong>完整模板</strong>
        <el-button text type="primary" @click="router.push('/resume')">去套用</el-button>
      </div>
      <div class="tpls">
        <div v-for="tpl in RESUME_TEMPLATES" :key="tpl.id" class="tpl">
          <i :style="{ background: tpl.color }" />
          <div>
            <strong>{{ tpl.name }}</strong>
            <span>{{ tpl.category }} · {{ tpl.audience }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hero h2 {
  margin: 6px 0 8px;
  font-size: 28px;
  line-height: 1.25;
  max-width: 720px;
}
.kicker {
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.sub {
  margin: 0 0 16px;
  color: var(--muted);
  max-width: 640px;
  line-height: 1.6;
}
.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.stat {
  text-align: left;
  cursor: pointer;
  color: inherit;
  border: 1px solid var(--line);
}
.stat span,
.stat em {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}
.stat strong {
  display: block;
  font-size: 22px;
  margin: 8px 0 4px;
}
.row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.tpls {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.tpl {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #f8fafc;
}
.tpl i {
  width: 12px;
  height: 36px;
  border-radius: 99px;
  display: block;
}
.tpl strong {
  display: block;
  font-size: 14px;
}
.tpl span {
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 1100px) {
  .stats,
  .tpls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
