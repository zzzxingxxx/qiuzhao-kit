<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  applyResumeTemplate,
  normalizeResume,
  resumeSchema,
  type Profile,
  type Resume,
  type ResumeTemplateId,
} from "@qiuzhao/schema";
import { pickPrimaryProfile, request } from "../api";
import TemplateGallery from "../components/TemplateGallery.vue";

const router = useRouter();
const current = ref("");
const applying = ref(false);

onMounted(async () => {
  try {
    const profiles = await request<{ items: Profile[] }>("/profiles");
    const profile = pickPrimaryProfile(profiles.items);
    if (!profile) return;
    const resumes = await request<{ items: Resume[] }>(`/resumes?profileId=${profile.id}`);
    if (resumes.items[0]) current.value = resumes.items[0].templateId;
  } catch {
    /* gallery still works */
  }
});

async function useTemplate(id: ResumeTemplateId) {
  if (applying.value) return;
  applying.value = true;
  try {
    const profiles = await request<{ items: Profile[] }>("/profiles");
    let profile = pickPrimaryProfile(profiles.items);
    if (!profile) {
      ElMessage.warning("请先填写档案里的姓名和学校");
      await router.push("/profile");
      return;
    }
    const existing = await request<{ items: Resume[] }>(`/resumes?profileId=${profile.id}`);
    let resume = existing.items[0]
      ? normalizeResume(resumeSchema.parse(existing.items[0]))
      : normalizeResume(
          resumeSchema.parse(
            await request<Resume>("/resumes", {
              method: "POST",
              body: JSON.stringify({ profileId: profile.id }),
            }),
          ),
        );
    resume = applyResumeTemplate(resume, id);
    await request(`/resumes/${resume.id}`, {
      method: "PUT",
      body: JSON.stringify(resume),
    });
    ElMessage.success("已套用完整范文，请把示例改成你自己的经历");
    await router.push("/resume");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "套用模板失败");
  } finally {
    applying.value = false;
  }
}
</script>

<template>
  <div v-loading="applying" class="page page-wide">
    <header class="page-head">
      <div>
        <h1>选一套完整模板</h1>
        <p>
          先选纸样，再改成自己的字。八套排版各有对应方向的校招范文（两段实习、两个项目、技能分组、校园、奖项、GPA 与课程），
          已填的姓名、手机、邮箱和教育会保留。点卡片即套用并进入工作室。
        </p>
      </div>
    </header>
    <TemplateGallery :model-value="current" large @update:model-value="useTemplate" />
  </div>
</template>
