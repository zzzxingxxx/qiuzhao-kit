import {
  applyFillMappings,
  clearFillMarks,
  extractFormSkeleton,
  highlightFillPlan,
  readFilledValues,
} from "@qiuzhao/fill/dom";
import type { FillCaptureChange, FillFieldPlan, FillPlan } from "@qiuzhao/schema";

type Row = FillFieldPlan & { include: boolean; saveToProfile: boolean; wasMissing: boolean };

const SERVER = "http://127.0.0.1:8787";
const HOST_ID = "qz-prefill-host";

declare global {
  interface Window {
    __qzPrefill?: () => void;
  }
}

const CSS = `
:host { all: initial; }
.fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
  height: 40px; padding: 0 14px; border: 0; border-radius: 999px;
  background: #1d4ed8; color: #fff; font: 600 13px/1 "Segoe UI","Microsoft YaHei",sans-serif;
  cursor: pointer; box-shadow: 0 8px 24px rgba(29,78,216,.35);
}
.panel {
  position: fixed; top: 16px; right: 16px; z-index: 2147483647;
  width: 360px; max-height: calc(100vh - 32px); overflow: auto;
  background: #fffaf3; color: #1f1b16; border: 1px solid #e4d9c8;
  border-radius: 12px; box-shadow: 0 16px 48px rgba(15,23,42,.18);
  font: 13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif; padding: 14px 16px 16px;
}
h1 { margin: 0 0 6px; font-size: 16px; }
h2 { margin: 10px 0 6px; font-size: 12px; color: #6f675c; }
.hint, .counts, .warn, .okmsg, .page { font-size: 12px; color: #6f675c; margin: 6px 0 0; }
.counts { font-weight: 650; color: #1f1b16; }
.err { margin: 8px 0 0; color: #c62828; font-size: 12px; }
.warn { color: #9a6b00; }
.okmsg { color: #2f7d32; font-weight: 650; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
button {
  border: 1px solid #e4d9c8; background: #fff; border-radius: 8px;
  padding: 6px 10px; font-size: 12px; cursor: pointer; font-family: inherit;
}
button.primary { background: #1f4e79; border-color: #1f4e79; color: #fff; }
button:disabled { opacity: .5; cursor: not-allowed; }
button.ghost { background: transparent; }
.group { max-height: 160px; overflow: auto; margin-top: 4px; }
.row { display: grid; grid-template-columns: 16px 88px 1fr; gap: 6px; align-items: center; margin-bottom: 6px; font-size: 12px; }
.lab { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.val { width: 100%; box-sizing: border-box; border: 1px solid #e4d9c8; border-radius: 6px; padding: 4px 6px; font-size: 12px; }
.miss .val { background: #fff8e8; }
.save { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; }
.close { position: absolute; top: 8px; right: 10px; border: 0; background: transparent; font-size: 16px; }
`;

let phase: "idle" | "review" | "done" = "idle";
let busy = false;
let error = "";
let plan: FillPlan | null = null;
let rows: Row[] = [];
let filledCount = 0;
let captured: FillCaptureChange[] = [];
let saveToArchive = true;
let root: ShadowRoot | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function host(): HTMLElement {
  let node = document.getElementById(HOST_ID);
  if (!node) {
    node = document.createElement("div");
    node.id = HOST_ID;
    document.documentElement.appendChild(node);
    root = node.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
  }
  root = node.shadowRoot;
  return node;
}

function render() {
  const shadow = host().shadowRoot;
  if (!shadow) return;
  [...shadow.querySelectorAll(".fab,.panel")].forEach((node) => node.remove());

  const fab = el("button", "fab", "秋招预填");
  fab.type = "button";
  fab.addEventListener("click", () => {
    void scan();
  });
  shadow.appendChild(fab);

  if (phase === "idle" && !error && !busy) return;

  const panel = el("div", "panel");
  const close = el("button", "close", "×");
  close.type = "button";
  close.addEventListener("click", cancel);
  panel.appendChild(close);
  panel.appendChild(el("h1", "", "秋招网申助手"));

  if (error) panel.appendChild(el("p", "err", error));

  if (phase === "idle") {
    const actions = el("div", "actions");
    const btn = el("button", "primary", busy ? "对照中…" : "预填此页");
    btn.type = "button";
    btn.disabled = busy;
    btn.addEventListener("click", () => void scan());
    actions.appendChild(btn);
    panel.appendChild(actions);
    panel.appendChild(el("p", "hint", "扫描本页表单，用本机档案对照，你确认后再写入。不会点提交。"));
  }

  if (phase === "review" && plan) {
    const high = rows.filter((row) => !row.wasMissing && row.value && row.confidence === "high");
    const unsure = rows.filter((row) => !row.wasMissing && row.value && row.confidence !== "high");
    const missing = rows.filter((row) => row.wasMissing);
    panel.appendChild(
      el("p", "counts", `将填 ${high.length} · 不确定 ${unsure.length} · 缺项 ${missing.length}`),
    );
    if (plan.needsKey) panel.appendChild(el("p", "warn", "未配置 API Key，目前只用标签规则。"));
    else if (plan.warning) panel.appendChild(el("p", "warn", plan.warning));
    addGroup(panel, "将填", high, false);
    addGroup(panel, "不确定", unsure, false);
    if (missing.length) {
      addGroup(panel, "档案里没有 · 自己补", missing, true);
    }
    const cap = rows.filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("不填")).length;
    const save = el("label", "save");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = saveToArchive;
    box.addEventListener("change", () => {
      saveToArchive = box.checked;
    });
    save.appendChild(box);
    save.appendChild(document.createTextNode(` 把我补的 ${cap} 项记入档案`));
    panel.appendChild(save);

    const selected = rows.filter((row) => row.include && row.value.trim()).length;
    const actions = el("div", "actions");
    const confirmBtn = el("button", "primary", busy ? "写入中…" : `确认写入 ${selected} 项`);
    confirmBtn.type = "button";
    confirmBtn.disabled = busy || !selected;
    confirmBtn.addEventListener("click", () => void confirmFill());
    const syncBtn = el("button", "ghost", "从本页同步");
    syncBtn.type = "button";
    syncBtn.disabled = busy;
    syncBtn.addEventListener("click", () => void syncFromPage());
    const cancelBtn = el("button", "ghost", "取消");
    cancelBtn.type = "button";
    cancelBtn.addEventListener("click", cancel);
    actions.append(confirmBtn, syncBtn, cancelBtn);
    panel.appendChild(actions);
    panel.appendChild(el("p", "hint", "不会点提交、验证码或登录。"));
  }

  if (phase === "done") {
    panel.appendChild(el("p", "okmsg", `已写入本页 ${filledCount} 项。请你本人核对后点页面上的提交。`));
    if (captured.length) {
      panel.appendChild(el("p", "okmsg", `已记入档案 ${captured.length} 项：${captured.map((item) => item.label).join("、")}`));
    }
    const actions = el("div", "actions");
    const back = el("button", "ghost", "返回");
    back.type = "button";
    back.addEventListener("click", cancel);
    actions.appendChild(back);
    panel.appendChild(actions);
  }

  shadow.appendChild(panel);
}

function addGroup(panel: HTMLElement, title: string, items: Row[], missing: boolean) {
  if (!items.length) return;
  panel.appendChild(el("h2", "", title));
  const group = el("div", "group");
  for (const row of items) {
    const label = el("label", missing ? "row miss" : "row");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = row.include;
    check.disabled = missing && !row.value.trim();
    check.addEventListener("change", () => {
      row.include = check.checked;
      render();
    });
    const name = el("span", "lab", row.label || row.id);
    const input = document.createElement("input");
    input.className = "val";
    input.type = "text";
    input.value = row.value;
    input.placeholder = row.skipReason || "在此填写";
    input.addEventListener("input", () => {
      row.value = input.value;
      if (missing) {
        row.include = Boolean(row.value.trim());
        if (row.value.trim()) row.saveToProfile = true;
      }
    });
    label.append(check, name, input);
    group.appendChild(label);
  }
  panel.appendChild(group);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(data.message || data.error || "请求失败");
  return data;
}

async function scan() {
  error = "";
  phase = "idle";
  busy = true;
  render();
  try {
    const fields = extractFormSkeleton(document);
    if (!fields.length) throw new Error("本页没有可填的输入框。");
    const data = await api<FillPlan>("/ai/map-form", {
      method: "POST",
      body: JSON.stringify({
        fields,
        pageUrl: location.href,
        pageTitle: document.title,
      }),
    });
    plan = data;
    rows = (data.fields ?? []).map((row) => {
      const empty = !row.value.trim();
      return {
        ...row,
        wasMissing: empty,
        include: !empty,
        saveToProfile: empty && !row.skipReason?.startsWith("不填"),
      };
    });
    phase = "review";
    highlightFillPlan(
      document,
      rows.map((row) => ({ id: row.id, confidence: row.confidence, empty: !row.value })),
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "预填失败";
  } finally {
    busy = false;
    render();
  }
}

async function syncFromPage() {
  const values = readFilledValues(document);
  const byId = new Map(values.map((item) => [item.id, item.value]));
  let n = 0;
  for (const row of rows) {
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
  error = n ? "" : "本页缺项还是空的。可以在页面上填完再点同步，或直接在上面补。";
  render();
}

async function confirmFill() {
  const selected = rows.filter((row) => row.include && row.value.trim()).map((row) => ({ id: row.id, value: row.value.trim() }));
  if (!selected.length) {
    error = "没有勾选要写入的项。";
    render();
    return;
  }
  busy = true;
  error = "";
  captured = [];
  render();
  try {
    const result = applyFillMappings(document, selected);
    filledCount = result.filled.length;
    if (saveToArchive) {
      const items = rows
        .filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("不填"))
        .map((row) => ({ id: row.id, label: row.label, value: row.value.trim(), source: row.source }));
      if (items.length) {
        const data = await api<{ applied?: FillCaptureChange[] }>("/profiles/capture", {
          method: "POST",
          body: JSON.stringify({ profileId: plan?.profileId, resumeId: plan?.resumeId, items }),
        });
        captured = data.applied ?? [];
      }
    }
    phase = "done";
  } catch (err) {
    error = err instanceof Error ? err.message : "写入失败";
  } finally {
    busy = false;
    render();
  }
}

function cancel() {
  phase = "idle";
  plan = null;
  rows = [];
  error = "";
  clearFillMarks(document);
  render();
}

function boot() {
  host();
  window.__qzPrefill = () => {
    void scan();
  };
  render();
}

boot();
