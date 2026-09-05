<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  BOARD_COLUMNS,
  STATUS_FLOW,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@qiuzhao/schema";
import { createApplication, deleteApplication, listApplications, updateApplication } from "../api";

const loading = ref(true);
const items = ref<Application[]>([]);
const selectedId = ref("");
const adding = ref(false);
const draft = ref({ company: "", jobTitle: "", applyUrl: "", status: "draft" as ApplicationStatus });

const selected = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null);
const nextStatuses = computed(() => (selected.value ? STATUS_FLOW[selected.value.status] : []));

function inColumn(key: ApplicationStatus) {
  return items.value.filter((item) => item.status === key);
}

async function load() {
  loading.value = true;
  try {
    const data = await listApplications();
    items.value = data.items;
    if (selectedId.value && !items.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = "";
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "读取投递列表失败");
  } finally {
    loading.value = false;
  }
}

async function addCard() {
  const company = draft.value.company.trim();
  if (!company) {
    ElMessage.warning("先填公司名");
    return;
  }
  try {
    const created = await createApplication({
      company,
      jobTitle: draft.value.jobTitle.trim(),
      applyUrl: draft.value.applyUrl.trim(),
      status: draft.value.status,
    });
    items.value = [created, ...items.value.filter((item) => item.id !== created.id)];
    selectedId.value = created.id;
    adding.value = false;
    draft.value = { company: "", jobTitle: "", applyUrl: "", status: "draft" };
    ElMessage.success("已记入看板");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "添加失败");
  }
}

async function patch(id: string, body: Partial<Application>) {
  try {
    const updated = await updateApplication(id, body);
    items.value = items.value.map((item) => (item.id === id ? updated : item));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "更新失败");
  }
}

async function setStatus(status: ApplicationStatus) {
  if (!selected.value) return;
  await patch(selected.value.id, { status });
}

async function remove() {
  if (!selected.value) return;
  if (!window.confirm(`删除「${selected.value.company || "未填公司"}」这条投递？`)) return;
  try {
    await deleteApplication(selected.value.id);
    items.value = items.value.filter((item) => item.id !== selected.value?.id);
    selectedId.value = "";
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "删除失败");
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div v-loading="loading" class="page page-wide">
    <header class="page-head">
      <div>
        <h1>投递看板</h1>
        <p>记录投过的公司和进展。预填后会自动建卡；提交按钮仍由你亲手点，再把状态改成「已投」。</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn" @click="load">刷新</button>
        <button type="button" class="btn btn-primary" @click="adding = !adding">记一笔</button>
      </div>
    </header>

    <form v-if="adding" class="surface add" @submit.prevent="addCard">
      <input v-model="draft.company" placeholder="公司 *" />
      <input v-model="draft.jobTitle" placeholder="岗位" />
      <input v-model="draft.applyUrl" placeholder="网申链接" />
      <select v-model="draft.status">
        <option v-for="col in BOARD_COLUMNS" :key="col.key" :value="col.key">{{ col.name }}</option>
      </select>
      <button type="submit" class="btn btn-primary">保存</button>
      <button type="button" class="btn" @click="adding = false">取消</button>
    </form>

    <div class="cols">
      <section v-for="col in BOARD_COLUMNS" :key="col.key" class="surface col">
        <header>
          <strong>{{ col.name }}</strong>
          <span>{{ inColumn(col.key).length }}</span>
        </header>
        <button
          v-for="card in inColumn(col.key)"
          :key="card.id"
          type="button"
          class="card"
          :class="{ on: card.id === selectedId }"
          @click="selectedId = card.id"
        >
          <b>{{ card.company || "未填公司" }}</b>
          <p>{{ card.jobTitle || "未填岗位" }}</p>
          <p v-if="card.missingFields.length" class="miss">缺 {{ card.missingFields.length }} 项</p>
        </button>
        <div v-if="!inColumn(col.key).length" class="empty">暂无卡片</div>
      </section>
    </div>

    <aside v-if="selected" class="surface detail">
      <header>
        <div>
          <h2>{{ selected.company || "未填公司" }}</h2>
          <p>{{ STATUS_LABELS[selected.status] }} · 简历 {{ selected.resumeVersion != null ? `v${selected.resumeVersion}` : "—" }}</p>
        </div>
        <button type="button" class="btn" @click="selectedId = ''">收起</button>
      </header>
      <div class="fields">
        <label>公司<input :value="selected.company" @change="patch(selected.id, { company: ($event.target as HTMLInputElement).value })" /></label>
        <label>岗位<input :value="selected.jobTitle" @change="patch(selected.id, { jobTitle: ($event.target as HTMLInputElement).value })" /></label>
        <label class="wide">链接<input :value="selected.applyUrl" @change="patch(selected.id, { applyUrl: ($event.target as HTMLInputElement).value })" /></label>
        <label class="wide">备注<textarea :value="selected.notes" rows="3" @change="patch(selected.id, { notes: ($event.target as HTMLTextAreaElement).value })" /></label>
      </div>
      <p v-if="selected.missingFields.length" class="hint">缺项：{{ selected.missingFields.join("、") }}</p>
      <div class="page-actions">
        <button
          v-for="status in nextStatuses"
          :key="status"
          type="button"
          class="btn"
          :class="{ 'btn-primary': status === 'submitted' }"
          @click="setStatus(status)"
        >
          {{ STATUS_LABELS[status] }}
        </button>
        <a v-if="selected.applyUrl" class="btn" :href="selected.applyUrl" target="_blank" rel="noreferrer">打开网申</a>
        <button type="button" class="btn" @click="remove">删除</button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.add {
  display: grid;
  grid-template-columns: 160px 160px 1fr 120px auto auto;
  gap: 8px;
  padding: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.add input,
.add select,
.fields input,
.fields textarea {
  width: 100%;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 10px;
  font: inherit;
}
.fields textarea {
  height: auto;
  padding: 8px 10px;
}
.cols {
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  gap: 10px;
  overflow-x: auto;
}
.col {
  min-height: 320px;
  padding: 14px;
}
.col header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 13px;
}
.card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
}
.card.on {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.card b {
  display: block;
  font-size: 13px;
}
.card p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.miss {
  color: var(--warn) !important;
}
.empty {
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 36px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  background: #fff;
}
.detail {
  margin-top: 16px;
  padding: 16px;
}
.detail header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.detail h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.detail header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.fields label {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}
.fields .wide {
  grid-column: 1 / -1;
}
@media (max-width: 1100px) {
  .cols {
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }
  .add {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
