<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getResumeTemplate, isProfileComplete, type Profile, type Resume } from "@qiuzhao/schema";
import { getAiSettings, listApplications, listProfiles, listResumes, pickPrimaryProfile } from "../api";
import { aiDrawerOpen, aiReady } from "../ai-ui";
import ResumePaper from "../components/ResumePaper.vue";

const router = useRouter();
const loading = ref(true);
const profile = ref<Profile | null>(null);
const resume = ref<Resume | null>(null);
const appCount = ref(0);

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
  <div v-loading="loading" class="page home">
    <header class="page-head">
      <div>
        <h1>工作台</h1>
        <p>本机优先的校招一页纸。档案、简历、投递都在这台电脑上，提交永远由你亲手点。</p>
      </div>
    </header>

    <section class="hero surface">
      <div class="copy">
        <p class="kicker">{{ resume ? getResumeTemplate(resume.templateId).name : "还没有简历" }}</p>
        <h2>{{ resume?.basics.name || profile?.name || "从档案开始" }}</h2>
        <p class="sub">
          {{
            resume
              ? `${resume.targetRole} · 版本 v${resume.version}`
              : "先把姓名、手机、学校填进档案，再套用一套完整校招模板。"
          }}
        </p>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" @click="router.push('/resume')">打开简历工作室</button>
          <button type="button" class="btn" @click="router.push('/profile')">完善档案</button>
          <button type="button" class="btn" @click="aiDrawerOpen = true">AI 助手</button>
        </div>
        <ul class="facts">
          <li><b>{{ profileState }}</b><span>档案</span></li>
          <li><b>{{ resume ? `v${resume.version}` : "—" }}</b><span>简历</span></li>
          <li><b>{{ appCount }}</b><span>投递</span></li>
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
        <div v-else class="desk-empty">套用模板后，这里会出现一页纸预览</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(280px, 420px);
  min-height: 420px;
  overflow: hidden;
}
.copy {
  padding: 36px 36px 28px;
}
.kicker {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.12em;
}
.copy h2 {
  margin: 0 0 10px;
  font-size: 36px;
  letter-spacing: -0.04em;
}
.sub {
  margin: 0 0 20px;
  color: var(--muted);
  line-height: 1.6;
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
  border-radius: 12px;
  padding: 10px 12px;
}
.facts b {
  display: block;
  font-size: 16px;
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
  color: #6b645b;
  font-size: 13px;
}
.mini {
  width: calc(210mm * 0.38);
  height: calc(297mm * 0.38);
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 18px 40px rgba(40, 28, 18, 0.18);
}
.mini-inner,
.mini-scale {
  width: 210mm;
}
.mini-scale {
  transform: scale(0.38);
  transform-origin: top left;
}
@media (max-width: 980px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .desk {
    min-height: 320px;
  }
  .facts {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
