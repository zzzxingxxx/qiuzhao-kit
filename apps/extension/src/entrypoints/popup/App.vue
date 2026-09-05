<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { browser } from "wxt/browser";
import type { FillCaptureChange, FillFieldPlan, FillPlan, FormField } from "@qiuzhao/schema";

type Row = FillFieldPlan & { include: boolean; saveToProfile: boolean; wasMissing: boolean };

const SERVER = "http://127.0.0.1:8787";
const SETTINGS = "http://127.0.0.1:5173/settings";
const PROFILE = "http://127.0.0.1:5173/profile";
const DEMO = "http://127.0.0.1:5173/apply-demo.html";

const ok = ref<boolean | null>(null);
const detail = ref("正在检查本机服务…");
const busy = ref(false);
const phase = ref<"idle" | "review" | "done">("idle");
const error = ref("");
const plan = ref<FillPlan | null>(null);
const rows = ref<Row[]>([]);
const filledCount = ref(0);
const captured = ref<FillCaptureChange[]>([]);
const pageTitle = ref("");
const saveToArchive = ref(true);

const high = computed(() => rows.value.filter((row) => !row.wasMissing && row.value && row.confidence === "high"));
const unsure = computed(() => rows.value.filter((row) => !row.wasMissing && row.value && row.confidence !== "high"));
const missing = computed(() => rows.value.filter((row) => row.wasMissing));
const selectedCount = computed(() => rows.value.filter((row) => row.include && row.value.trim()).length);
const captureCount = computed(
  () => rows.value.filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("不填")).length,
);

onMounted(async () => {
  try {
    const res = await fetch(`${SERVER}/health`);
    const data = await res.json();
    ok.value = Boolean(data.ok);
    detail.value = ok.value ? `已连接 · ${data.service}` : "服务响应异常";
  } catch {
    ok.value = false;
    detail.value = "未连接。请先运行 pnpm dev:server 或 start.bat";
  }
});

function canInject(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function send<T>(tabId: number, payload: object): Promise<T> {
  return (await browser.tabs.sendMessage(tabId, payload)) as T;
}

async function scan() {
  error.value = "";
  plan.value = null;
  rows.value = [];
  phase.value = "idle";
  if (!ok.value) {
    error.value = "本机服务未连接。";
    return;
  }
  const tab = await activeTab();
  if (!tab?.id || !canInject(tab.url)) {
    error.value = "当前页不能预填（请打开普通 http/https 网申页）。";
    return;
  }
  busy.value = true;
  try {
    let extracted: { ok: boolean; fields?: FormField[]; title?: string; href?: string; error?: string };
    try {
      extracted = await send(tab.id, { type: "QZ_EXTRACT" });
    } catch {
      error.value = "请刷新此页后再点预填（扩展脚本尚未注入）。";
      return;
    }
    if (!extracted.ok || !extracted.fields?.length) {
      error.value = extracted.error || "本页没有可填的输入框。";
      return;
    }
    pageTitle.value = extracted.title || tab.title || "";
    const res = await fetch(`${SERVER}/ai/map-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: extracted.fields,
        pageUrl: extracted.href || tab.url,
        pageTitle: extracted.title,
      }),
    });
    const data = (await res.json()) as FillPlan & { error?: string; message?: string };
    if (!res.ok) {
      error.value = data.message || data.error || "对照失败";
      return;
    }
    plan.value = data;
    rows.value = (data.fields ?? []).map((row) => {
      const empty = !row.value.trim();
      return {
        ...row,
        wasMissing: empty,
        include: !empty,
        saveToProfile: empty && !row.skipReason?.startsWith("不填"),
      };
    });
    phase.value = "review";
    await send(tab.id, {
      type: "QZ_HIGHLIGHT",
      items: rows.value.map((row) => ({
        id: row.id,
        confidence: row.confidence,
        empty: !row.value,
      })),
    }).catch(() => undefined);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "预填失败";
  } finally {
    busy.value = false;
  }
}

function onMissingInput(row: Row) {
  const has = Boolean(row.value.trim());
  row.include = has;
  if (has) row.saveToProfile = true;
}

async function syncFromPage() {
  const tab = await activeTab();
  if (!tab?.id) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await send<{ ok: boolean; values?: { id: string; value: string }[]; error?: string }>(tab.id, {
      type: "QZ_READ",
    });
    if (!result.ok) {
      error.value = result.error || "读不到本页已填内容";
      return;
    }
    const byId = new Map((result.values ?? []).map((item) => [item.id, item.value]));
    let n = 0;
    for (const row of rows.value) {
      const value = byId.get(row.id)?.trim();
      if (!value) continue;
      if (row.wasMissing && !row.value.trim()) {
        row.value = value;
        row.include = true;
        row.saveToProfile = true;
        n += 1;
      } else if (!row.value.trim()) {
        row.value = value;
        row.include = true;
        n += 1;
      }
    }
    if (!n) error.value = "本页缺项还是空的。可以在页面上填完再点同步，或直接在上面补。";
  } catch {
    error.value = "请刷新此页后再同步。";
  } finally {
    busy.value = false;
  }
}

async function saveCapture() {
  if (!saveToArchive.value) return;
  const items = rows.value
    .filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("不填"))
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value.trim(),
      source: row.source,
    }));
  if (!items.length) return;
  const res = await fetch(`${SERVER}/profiles/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profileId: plan.value?.profileId,
      resumeId: plan.value?.resumeId,
      items,
    }),
  });
  const data = (await res.json()) as { applied?: FillCaptureChange[]; message?: string; error?: string };
  if (!res.ok) {
    error.value = data.message || data.error || "写回档案失败";
    return;
  }
  captured.value = data.applied ?? [];
}

async function confirmFill() {
  const tab = await activeTab();
  if (!tab?.id) return;
  const selected = rows.value
    .filter((row) => row.include && row.value.trim())
    .map((row) => ({ id: row.id, value: row.value.trim() }));
  if (!selected.length) {
    error.value = "没有勾选要写入的项。可先补缺项，或从本页同步。";
    return;
  }
  busy.value = true;
  error.value = "";
  captured.value = [];
  try {
    const result = await send<{ ok: boolean; filled?: string[]; error?: string }>(tab.id, {
      type: "QZ_APPLY",
      fields: selected,
    });
    if (!result.ok) {
      error.value = result.error || "写入失败";
      return;
    }
    filledCount.value = result.filled?.length ?? selected.length;
    await saveCapture();
    phase.value = "done";
  } catch {
    error.value = "请刷新此页后再写入。";
  } finally {
    busy.value = false;
  }
}

async function cancel() {
  phase.value = "idle";
  plan.value = null;
  rows.value = [];
  const tab = await activeTab();
  if (tab?.id) await send(tab.id, { type: "QZ_CLEAR" }).catch(() => undefined);
}

function openUrl(url: string) {
  browser.tabs.create({ url });
}
</script>

<template>
  <div class="box">
    <h1>秋招网申助手</h1>
    <p class="state" :class="{ on: ok === true, off: ok === false }">
      {{ ok === true ? "本机服务已连接" : ok === false ? "本机服务未连接" : "检查中" }}
    </p>
    <p class="detail">{{ detail }}</p>

    <div class="actions">
      <button type="button" class="primary" :disabled="busy || ok !== true" @click="scan">
        {{ busy && phase === "idle" ? "对照中…" : "预填此页" }}
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>

    <p v-if="plan?.needsKey" class="warn">
      未配置 API Key，目前只用标签规则。
      <button type="button" class="link" @click="openUrl(SETTINGS)">去设置</button>
    </p>
    <p v-else-if="plan?.warning" class="warn">{{ plan.warning }}</p>

    <template v-if="phase === 'review' && plan">
      <p class="counts">
        将填 {{ high.length }} · 不确定 {{ unsure.length }} · 缺项 {{ missing.length }}
        <span v-if="plan.profileName"> · {{ plan.profileName }}</span>
      </p>
      <p v-if="pageTitle" class="page">{{ pageTitle }}</p>
      <p v-if="plan.atsNote" class="hint">ATS 备注：{{ plan.atsNote }}（不影响预填）</p>

      <section v-if="high.length" class="group">
        <h2>将填</h2>
        <label v-for="row in high" :key="row.id" class="row">
          <input v-model="row.include" type="checkbox" />
          <span class="lab">{{ row.label || row.id }}</span>
          <input v-model="row.value" class="val" type="text" />
        </label>
      </section>
      <section v-if="unsure.length" class="group">
        <h2>不确定</h2>
        <label v-for="row in unsure" :key="row.id" class="row">
          <input v-model="row.include" type="checkbox" />
          <span class="lab">{{ row.label || row.id }}</span>
          <input v-model="row.value" class="val" type="text" />
        </label>
      </section>
      <section v-if="missing.length" class="group">
        <h2>档案里没有 · 自己补</h2>
        <p class="hint">不同网站题目不一样。补上后写入本页，并记入档案，下次不用再填。</p>
        <label v-for="row in missing" :key="row.id" class="row miss-row">
          <input v-model="row.include" type="checkbox" :disabled="!row.value.trim()" />
          <span class="lab" :title="row.skipReason">{{ row.label || row.id }}</span>
          <input
            v-model="row.value"
            class="val"
            type="text"
            :placeholder="row.skipReason || '在此填写'"
            @input="onMissingInput(row)"
          />
        </label>
      </section>

      <label class="save">
        <input v-model="saveToArchive" type="checkbox" />
        把我补的 {{ captureCount }} 项记入档案
      </label>

      <div class="actions">
        <button type="button" class="primary" :disabled="busy || !selectedCount" @click="confirmFill">
          确认写入 {{ selectedCount }} 项
        </button>
        <button type="button" class="ghost" :disabled="busy" @click="syncFromPage">从本页同步</button>
        <button type="button" class="ghost" :disabled="busy" @click="cancel">取消</button>
      </div>
      <p class="hint">不会点提交、验证码或登录。也可先在网页上填缺项，再点「从本页同步」。</p>
    </template>

    <template v-else-if="phase === 'done'">
      <p class="okmsg">已写入本页 {{ filledCount }} 项。请你本人核对后点页面上的提交。</p>
      <p v-if="captured.length" class="okmsg">已记入档案 {{ captured.length }} 项：{{ captured.map((item) => item.label).join("、") }}</p>
      <p v-else-if="saveToArchive" class="hint">没有新内容可记入档案（空项或档案里已有）。</p>
      <div class="actions">
        <button type="button" class="ghost" @click="openUrl(PROFILE)">查看档案</button>
        <button type="button" class="ghost" @click="phase = 'idle'">返回</button>
      </div>
    </template>

    <p v-else class="hint">
      扫描当前页可见表单，用本机档案对照，你确认后再写入。
      <button type="button" class="link" @click="openUrl(DEMO)">打开演示页</button>
    </p>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  width: 360px;
  max-height: 560px;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}
.box {
  padding: 14px 16px 16px;
  background: #fffaf3;
  color: #1f1b16;
}
h1 {
  margin: 0 0 6px;
  font-size: 16px;
}
h2 {
  margin: 10px 0 6px;
  font-size: 12px;
  color: #6f675c;
  font-weight: 650;
}
.state {
  font-weight: 600;
  margin: 0;
}
.state.on {
  color: #2f7d32;
}
.state.off {
  color: #c62828;
}
.detail,
.hint,
.page,
.counts,
.warn,
.miss,
.okmsg {
  font-size: 12px;
  color: #6f675c;
  line-height: 1.5;
  margin: 6px 0 0;
}
.counts {
  font-weight: 650;
  color: #1f1b16;
}
.err {
  margin: 8px 0 0;
  color: #c62828;
  font-size: 12px;
}
.warn {
  color: #9a6b00;
}
.okmsg {
  color: #2f7d32;
  font-weight: 650;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
button {
  border: 1px solid #e4d9c8;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}
button.primary {
  background: #1f4e79;
  border-color: #1f4e79;
  color: #fff;
}
button.primary:disabled,
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.ghost {
  background: transparent;
}
button.link {
  border: 0;
  background: none;
  padding: 0;
  color: #1f4e79;
  text-decoration: underline;
}
.group {
  max-height: 160px;
  overflow: auto;
  margin-top: 4px;
}
.row {
  display: grid;
  grid-template-columns: 16px 88px 1fr;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}
.lab {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.val {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e4d9c8;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 12px;
}
.miss {
  margin: 0 0 4px;
}
.miss-row .val {
  background: #fff8e8;
}
.save {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
}
</style>
