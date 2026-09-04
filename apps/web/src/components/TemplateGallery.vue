<script setup lang="ts">
import { computed, ref } from "vue";
import {
  RESUME_TEMPLATE_CATEGORIES,
  RESUME_TEMPLATES,
  createCompleteSampleResume,
  type ResumeTemplateCategory,
  type ResumeTemplateId,
} from "@qiuzhao/schema";
import ResumePaper from "./ResumePaper.vue";

defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [id: ResumeTemplateId];
}>();

const category = ref<"全部" | ResumeTemplateCategory>("全部");

const filtered = computed(() => {
  const list =
    category.value === "全部"
      ? RESUME_TEMPLATES
      : RESUME_TEMPLATES.filter((tpl) => tpl.category === category.value);
  return list.map((tpl) => ({
    tpl,
    resume: createCompleteSampleResume(tpl.id),
  }));
});
</script>

<template>
  <div class="gallery no-print">
    <div class="gallery-head">
      <div>
        <strong>完整模板 · {{ RESUME_TEMPLATES.length }} 套</strong>
        <span>点选即套用全模块校招示例。已填的姓名、手机、邮箱和教育会保留。</span>
      </div>
      <div class="cats">
        <button
          type="button"
          class="cat"
          :class="{ on: category === '全部' }"
          @click="category = '全部'"
        >
          全部
        </button>
        <button
          v-for="item in RESUME_TEMPLATE_CATEGORIES"
          :key="item"
          type="button"
          class="cat"
          :class="{ on: category === item }"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
    </div>
    <div class="cards">
      <button
        v-for="item in filtered"
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
        <div class="tags">
          <span v-for="tag in item.tpl.tags" :key="tag">{{ tag }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px 18px;
  margin-bottom: 16px;
  box-shadow: var(--shadow);
}
.gallery-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.gallery-head span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.cats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cat {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--ink);
}
.cat.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
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
  border-radius: 12px;
  padding: 8px 8px 12px;
  cursor: pointer;
  color: inherit;
}
.card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent);
}
.card strong {
  display: block;
  margin-top: 8px;
  font-size: 14px;
}
.card em {
  display: block;
  font-style: normal;
  color: var(--accent);
  font-size: 12px;
  margin: 2px 0 4px;
}
.card p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.tags span {
  font-size: 11px;
  background: var(--chip);
  color: var(--muted);
  border-radius: 999px;
  padding: 1px 7px;
}
.mini-frame {
  height: 248px;
  overflow: hidden;
  background: #d7dde6;
  border-radius: 8px;
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
@media (max-width: 1280px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
