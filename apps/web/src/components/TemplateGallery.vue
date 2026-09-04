<script setup lang="ts">
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@qiuzhao/schema";

defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [id: ResumeTemplateId];
}>();
</script>

<template>
  <div class="gallery no-print">
    <div class="gallery-head">
      <strong>选择模板</strong>
      <span>一份内容可套用任意排版，切换不会清空实习和项目。</span>
    </div>
    <div class="cards">
      <button
        v-for="tpl in RESUME_TEMPLATES"
        :key="tpl.id"
        type="button"
        class="card"
        :class="{ active: modelValue === tpl.id }"
        @click="emit('update:modelValue', tpl.id)"
      >
        <div class="mini" :class="'mini-' + tpl.layout" :style="{ '--c': tpl.color }">
          <template v-if="tpl.layout === 'sidebar'">
            <i class="mini-rail" />
            <i class="mini-lines" />
          </template>
          <template v-else-if="tpl.layout === 'banner'">
            <i class="mini-band" />
            <i class="mini-lines" />
          </template>
          <template v-else-if="tpl.layout === 'classic'">
            <i class="mini-center" />
            <i class="mini-lines" />
          </template>
          <template v-else>
            <i class="mini-left" />
            <i class="mini-lines" />
          </template>
        </div>
        <strong>{{ tpl.name }}</strong>
        <em>{{ tpl.audience }}</em>
        <p>{{ tpl.description }}</p>
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
  gap: 10px;
}
.card {
  text-align: left;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 8px;
  padding: 10px;
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
.mini {
  height: 72px;
  border-radius: 4px;
  background: #f3f1ec;
  display: flex;
  overflow: hidden;
  --c: #1f4e79;
}
.mini i {
  display: block;
}
.mini-tech,
.mini-classic,
.mini-banner {
  flex-direction: column;
  padding: 8px;
  gap: 6px;
}
.mini-left {
  height: 10px;
  width: 55%;
  background: var(--c);
  border-radius: 1px;
}
.mini-center {
  height: 8px;
  width: 40%;
  margin: 0 auto;
  background: #333;
  border-radius: 1px;
}
.mini-band {
  height: 18px;
  margin: -8px -8px 0;
  background: var(--c);
}
.mini-lines {
  flex: 1;
  background:
    repeating-linear-gradient(
      to bottom,
      #d4d0c8 0 3px,
      transparent 3px 9px
    );
  opacity: 0.9;
}
.mini-sidebar {
  flex-direction: row;
}
.mini-rail {
  width: 28%;
  background: var(--c);
}
.mini-sidebar .mini-lines {
  flex: 1;
  margin: 8px;
}
@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
