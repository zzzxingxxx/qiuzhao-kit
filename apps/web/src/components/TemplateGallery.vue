<script setup lang="ts">
import { computed } from "vue";
import {
  RESUME_TEMPLATES,
  createCompleteSampleResume,
  type ResumeTemplateId,
} from "@qiuzhao/schema";
import ResumePaper from "./ResumePaper.vue";

defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [id: ResumeTemplateId];
}>();

const previews = computed(() =>
  RESUME_TEMPLATES.map((tpl) => ({
    tpl,
    resume: createCompleteSampleResume(tpl.id),
  })),
);
</script>

<template>
  <div class="gallery no-print">
    <div class="gallery-head">
      <strong>完整模板</strong>
      <span>每套都是全模块校招一页纸。点选即套用完整示例，已填的姓名、手机、邮箱和教育会保留。</span>
    </div>
    <div class="cards">
      <button
        v-for="item in previews"
        :key="item.tpl.id"
        type="button"
        class="card"
        :class="{ active: modelValue === item.tpl.id }"
        @click="emit('update:modelValue', item.tpl.id)"
      >
        <div class="mini-frame">
          <div class="mini-inner">
            <div class="mini-scale">
              <ResumePaper :resume="item.resume" />
            </div>
          </div>
        </div>
        <strong>{{ item.tpl.name }}</strong>
        <em>{{ item.tpl.audience }}</em>
        <p>{{ item.tpl.description }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 16px 16px;
  margin-bottom: 16px;
}
.gallery-head {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.gallery-head span {
  color: var(--muted);
  font-size: 12px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.card {
  text-align: left;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 8px;
  padding: 8px 8px 12px;
  cursor: pointer;
  color: inherit;
}
.card.active {
  border-color: #1f4e79;
  box-shadow: 0 0 0 2px rgba(31, 78, 121, 0.18);
}
.card strong {
  display: block;
  margin-top: 8px;
  font-size: 14px;
}
.card em {
  display: block;
  font-style: normal;
  color: #1f4e79;
  font-size: 12px;
  margin: 2px 0 4px;
}
.card p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
.mini-frame {
  height: 248px;
  overflow: hidden;
  background: #d9d5ce;
  border-radius: 4px;
  pointer-events: none;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}
.mini-inner {
  width: calc(210mm * 0.32);
  height: calc(297mm * 0.32);
  overflow: hidden;
}
.mini-scale {
  transform: scale(0.32);
  transform-origin: top left;
  width: 210mm;
}
.mini-scale :deep(.paper) {
  box-shadow: 0 4px 12px rgba(20, 30, 50, 0.16);
}
@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
