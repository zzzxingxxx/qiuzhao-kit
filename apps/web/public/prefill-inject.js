/* generated from src/prefill-inject.ts - do not edit */
"use strict";
(() => {
  // ../../packages/fill/src/dom.ts
  var SKIP_INPUT_TYPES = /* @__PURE__ */ new Set([
    "password",
    "hidden",
    "file",
    "submit",
    "button",
    "reset",
    "image",
    "color",
    "range"
  ]);
  var STYLE_ID = "qz-fill-style";
  function cssEscape(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  function cleanText(value) {
    return value.replace(/\s+/g, " ").replace(/[*＊:：]/g, "").trim().slice(0, 80);
  }
  function isVisible(el2) {
    if (el2.hidden) return false;
    if (el2.getAttribute("aria-hidden") === "true") return false;
    const style = el2.ownerDocument.defaultView?.getComputedStyle(el2);
    if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
      return false;
    }
    const rect = el2.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }
  function looksLikeCaptcha(el2, label) {
    const hay = `${label} ${el2.getAttribute("name") ?? ""} ${el2.id} ${el2.getAttribute("placeholder") ?? ""}`.toLowerCase();
    return /验证码|captcha|vcode|verifycode|sms.?code/.test(hay);
  }
  function controlType(el2) {
    if (el2 instanceof HTMLTextAreaElement) return "textarea";
    if (el2 instanceof HTMLSelectElement) return "select";
    if (el2 instanceof HTMLInputElement) {
      const type = (el2.type || "text").toLowerCase();
      if (type === "email") return "email";
      if (type === "tel") return "tel";
      if (type === "number") return "number";
      if (type === "date" || type === "datetime-local" || type === "month") return "date";
      if (type === "url") return "url";
      if (type === "radio") return "radio";
      if (type === "checkbox") return "checkbox";
      if (type === "text" || type === "search") return "text";
      return "other";
    }
    return "other";
  }
  function resolveLabel(el2) {
    const doc = el2.ownerDocument;
    if (el2.id) {
      const lab = doc.querySelector(`label[for="${cssEscape(el2.id)}"]`);
      if (lab?.textContent) {
        const text = cleanText(lab.textContent);
        if (text) return text;
      }
    }
    const aria = el2.getAttribute("aria-label");
    if (aria) return cleanText(aria);
    const labelled = el2.getAttribute("aria-labelledby");
    if (labelled) {
      const text = cleanText(
        labelled.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? "").join(" ")
      );
      if (text) return text;
    }
    let node = el2;
    for (let i = 0; i < 6 && node && node !== doc.body; i++) {
      const prev = node.previousElementSibling;
      if (prev && !prev.matches("input, select, textarea, button")) {
        const clone = prev.cloneNode(true);
        clone.querySelectorAll("input,select,textarea,button").forEach((child) => child.remove());
        const text = cleanText(clone.textContent ?? "");
        if (text && text.length < 40) return text;
      }
      node = node.parentElement;
    }
    const closest = el2.closest("label");
    if (closest) {
      const clone = closest.cloneNode(true);
      clone.querySelectorAll("input,select,textarea,button").forEach((child) => child.remove());
      const text = cleanText(clone.textContent ?? "");
      if (text) return text;
    }
    return cleanText(el2.getAttribute("placeholder") ?? el2.getAttribute("name") ?? "");
  }
  function optionLabel(el2) {
    const closest = el2.closest("label");
    if (closest) {
      const clone = closest.cloneNode(true);
      clone.querySelectorAll("input").forEach((node) => node.remove());
      const text = cleanText(clone.textContent ?? "");
      if (text) return text;
    }
    return el2.value || resolveLabel(el2);
  }
  function collectOptions(el2) {
    if (el2 instanceof HTMLSelectElement) {
      return [...el2.options].map((opt) => cleanText(opt.text || opt.value)).filter((text) => text && text !== "\u8BF7\u9009\u62E9");
    }
    if (el2 instanceof HTMLInputElement && el2.type === "radio" && el2.name) {
      const group = el2.ownerDocument.querySelectorAll(`input[type="radio"][name="${cssEscape(el2.name)}"]`);
      return [...group].map((node) => optionLabel(node)).filter(Boolean);
    }
    if (el2 instanceof HTMLInputElement && el2.type === "checkbox") {
      return ["\u662F", "\u5426"];
    }
    return [];
  }
  function nativeSet(el2, value) {
    const proto = el2 instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc?.set) desc.set.call(el2, value);
    else el2.value = value;
    el2.dispatchEvent(new Event("input", { bubbles: true }));
    el2.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function truthy(value) {
    return /^(1|true|yes|y|是|有|对)$/i.test(value.trim());
  }
  function extractFormSkeleton(doc = document) {
    const controls = doc.querySelectorAll("input, textarea, select");
    const fields = [];
    const seenRadio = /* @__PURE__ */ new Set();
    let index = 0;
    for (const node of controls) {
      if (!(node instanceof HTMLElement)) continue;
      if (!isVisible(node)) continue;
      if (node instanceof HTMLInputElement && SKIP_INPUT_TYPES.has((node.type || "").toLowerCase())) continue;
      if (node.disabled) continue;
      const type = controlType(node);
      if (type === "other") continue;
      const label = resolveLabel(node);
      if (looksLikeCaptcha(node, label)) continue;
      if (node instanceof HTMLInputElement && node.type === "radio") {
        const key = node.name || node.id || `radio-${index}`;
        if (seenRadio.has(key)) continue;
        seenRadio.add(key);
      }
      if (fields.length >= 120) break;
      const id = `qz-${index++}`;
      if (node instanceof HTMLInputElement && node.type === "radio" && node.name) {
        node.ownerDocument.querySelectorAll(`input[type="radio"][name="${cssEscape(node.name)}"]`).forEach((radio) => radio.setAttribute("data-qz-id", id));
      } else {
        node.setAttribute("data-qz-id", id);
      }
      fields.push({
        id,
        label,
        name: node.getAttribute("name") ?? "",
        type,
        required: node.hasAttribute("required") || node.getAttribute("aria-required") === "true",
        options: collectOptions(node),
        placeholder: node.getAttribute("placeholder") ?? "",
        autocomplete: node.getAttribute("autocomplete") ?? ""
      });
    }
    return fields;
  }
  function applyFillMappings(doc, mappings) {
    const filled = [];
    const skipped = [];
    for (const item of mappings) {
      const value = item.value?.trim() ?? "";
      if (!value) {
        skipped.push(item.id);
        continue;
      }
      const nodes = [...doc.querySelectorAll(`[data-qz-id="${cssEscape(item.id)}"]`)];
      if (!nodes.length) {
        skipped.push(item.id);
        continue;
      }
      const el2 = nodes[0];
      if (!(el2 instanceof HTMLElement)) {
        skipped.push(item.id);
        continue;
      }
      if (el2 instanceof HTMLInputElement && SKIP_INPUT_TYPES.has((el2.type || "").toLowerCase())) {
        skipped.push(item.id);
        continue;
      }
      if (el2 instanceof HTMLSelectElement) {
        const matched = [...el2.options].find((opt) => (opt.text || opt.value).trim() === value) ?? [...el2.options].find((opt) => {
          const t = (opt.text || opt.value).trim();
          return t.includes(value) || value.includes(t);
        });
        if (matched) el2.value = matched.value;
        else el2.value = value;
        el2.dispatchEvent(new Event("input", { bubbles: true }));
        el2.dispatchEvent(new Event("change", { bubbles: true }));
        filled.push(item.id);
        continue;
      }
      if (el2 instanceof HTMLInputElement && el2.type === "radio") {
        const hit = nodes.find((node) => node instanceof HTMLInputElement && (node.value === value || optionLabel(node) === value)) ?? nodes.find(
          (node) => node instanceof HTMLInputElement && (optionLabel(node).includes(value) || value.includes(optionLabel(node)))
        );
        if (hit instanceof HTMLInputElement) {
          hit.checked = true;
          hit.dispatchEvent(new Event("input", { bubbles: true }));
          hit.dispatchEvent(new Event("change", { bubbles: true }));
          filled.push(item.id);
        } else {
          skipped.push(item.id);
        }
        continue;
      }
      if (el2 instanceof HTMLInputElement && el2.type === "checkbox") {
        el2.checked = truthy(value);
        el2.dispatchEvent(new Event("input", { bubbles: true }));
        el2.dispatchEvent(new Event("change", { bubbles: true }));
        filled.push(item.id);
        continue;
      }
      if (el2 instanceof HTMLInputElement || el2 instanceof HTMLTextAreaElement) {
        nativeSet(el2, value);
        filled.push(item.id);
        continue;
      }
      skipped.push(item.id);
    }
    return { filled, skipped };
  }
  function highlightFillPlan(doc, items) {
    ensureStyle(doc);
    doc.querySelectorAll("[data-qz-id]").forEach((node) => {
      node.classList.remove("qz-fill-high", "qz-fill-medium", "qz-fill-missing");
    });
    for (const item of items) {
      const nodes = doc.querySelectorAll(`[data-qz-id="${cssEscape(item.id)}"]`);
      const cls = item.empty ? "qz-fill-missing" : item.confidence === "high" ? "qz-fill-high" : "qz-fill-medium";
      nodes.forEach((node) => node.classList.add(cls));
    }
  }
  function readFilledValues(doc) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const node of doc.querySelectorAll("[data-qz-id]")) {
      if (!(node instanceof HTMLElement)) continue;
      const id = node.getAttribute("data-qz-id") ?? "";
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const nodes = [...doc.querySelectorAll(`[data-qz-id="${cssEscape(id)}"]`)];
      const el2 = nodes[0];
      if (el2 instanceof HTMLSelectElement) {
        const opt = el2.selectedOptions[0];
        const text = (opt?.text || el2.value || "").trim();
        if (text && text !== "\u8BF7\u9009\u62E9") result.push({ id, value: text });
        continue;
      }
      if (el2 instanceof HTMLInputElement && el2.type === "radio") {
        const checked = nodes.find((item) => item instanceof HTMLInputElement && item.checked);
        if (checked instanceof HTMLInputElement) {
          result.push({ id, value: optionLabel(checked) || checked.value });
        }
        continue;
      }
      if (el2 instanceof HTMLInputElement && el2.type === "checkbox") {
        result.push({ id, value: el2.checked ? "\u662F" : "\u5426" });
        continue;
      }
      if (el2 instanceof HTMLInputElement || el2 instanceof HTMLTextAreaElement) {
        const value = el2.value.trim();
        if (value) result.push({ id, value });
      }
    }
    return result;
  }
  function clearFillMarks(doc) {
    doc.querySelectorAll("[data-qz-id]").forEach((node) => {
      node.classList.remove("qz-fill-high", "qz-fill-medium", "qz-fill-missing");
    });
  }
  function ensureStyle(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    [data-qz-id].qz-fill-high { outline: 2px solid #2f7d32 !important; outline-offset: 2px; }
    [data-qz-id].qz-fill-medium { outline: 2px solid #d4a017 !important; outline-offset: 2px; }
    [data-qz-id].qz-fill-missing { outline: 2px dashed #9aa0a6 !important; outline-offset: 2px; }
  `;
    doc.documentElement.appendChild(style);
  }

  // src/prefill-inject.ts
  var SERVER = "http://127.0.0.1:8787";
  var HOST_ID = "qz-prefill-host";
  var CSS2 = `
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
  var phase = "idle";
  var busy = false;
  var error = "";
  var plan = null;
  var rows = [];
  var filledCount = 0;
  var captured = [];
  var saveToArchive = true;
  var root = null;
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function host() {
    let node = document.getElementById(HOST_ID);
    if (!node) {
      node = document.createElement("div");
      node.id = HOST_ID;
      document.documentElement.appendChild(node);
      root = node.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS2;
      root.appendChild(style);
    }
    root = node.shadowRoot;
    return node;
  }
  function render() {
    const shadow = host().shadowRoot;
    if (!shadow) return;
    [...shadow.querySelectorAll(".fab,.panel")].forEach((node) => node.remove());
    const fab = el("button", "fab", "\u79CB\u62DB\u9884\u586B");
    fab.type = "button";
    fab.addEventListener("click", () => {
      void scan();
    });
    shadow.appendChild(fab);
    if (phase === "idle" && !error && !busy) return;
    const panel = el("div", "panel");
    const close = el("button", "close", "\xD7");
    close.type = "button";
    close.addEventListener("click", cancel);
    panel.appendChild(close);
    panel.appendChild(el("h1", "", "\u79CB\u62DB\u7F51\u7533\u52A9\u624B"));
    if (error) panel.appendChild(el("p", "err", error));
    if (phase === "idle") {
      const actions = el("div", "actions");
      const btn = el("button", "primary", busy ? "\u5BF9\u7167\u4E2D\u2026" : "\u9884\u586B\u6B64\u9875");
      btn.type = "button";
      btn.disabled = busy;
      btn.addEventListener("click", () => void scan());
      actions.appendChild(btn);
      panel.appendChild(actions);
      panel.appendChild(el("p", "hint", "\u626B\u63CF\u672C\u9875\u8868\u5355\uFF0C\u7528\u672C\u673A\u6863\u6848\u5BF9\u7167\uFF0C\u4F60\u786E\u8BA4\u540E\u518D\u5199\u5165\u3002\u4E0D\u4F1A\u70B9\u63D0\u4EA4\u3002"));
    }
    if (phase === "review" && plan) {
      const high = rows.filter((row) => !row.wasMissing && row.value && row.confidence === "high");
      const unsure = rows.filter((row) => !row.wasMissing && row.value && row.confidence !== "high");
      const missing = rows.filter((row) => row.wasMissing);
      panel.appendChild(
        el("p", "counts", `\u5C06\u586B ${high.length} \xB7 \u4E0D\u786E\u5B9A ${unsure.length} \xB7 \u7F3A\u9879 ${missing.length}`)
      );
      if (plan.needsKey) panel.appendChild(el("p", "warn", "\u672A\u914D\u7F6E API Key\uFF0C\u76EE\u524D\u53EA\u7528\u6807\u7B7E\u89C4\u5219\u3002"));
      else if (plan.warning) panel.appendChild(el("p", "warn", plan.warning));
      addGroup(panel, "\u5C06\u586B", high, false);
      addGroup(panel, "\u4E0D\u786E\u5B9A", unsure, false);
      if (missing.length) {
        addGroup(panel, "\u6863\u6848\u91CC\u6CA1\u6709 \xB7 \u81EA\u5DF1\u8865", missing, true);
      }
      const cap = rows.filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("\u4E0D\u586B")).length;
      const save = el("label", "save");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = saveToArchive;
      box.addEventListener("change", () => {
        saveToArchive = box.checked;
      });
      save.appendChild(box);
      save.appendChild(document.createTextNode(` \u628A\u6211\u8865\u7684 ${cap} \u9879\u8BB0\u5165\u6863\u6848`));
      panel.appendChild(save);
      const selected = rows.filter((row) => row.include && row.value.trim()).length;
      const actions = el("div", "actions");
      const confirmBtn = el("button", "primary", busy ? "\u5199\u5165\u4E2D\u2026" : `\u786E\u8BA4\u5199\u5165 ${selected} \u9879`);
      confirmBtn.type = "button";
      confirmBtn.disabled = busy || !selected;
      confirmBtn.addEventListener("click", () => void confirmFill());
      const syncBtn = el("button", "ghost", "\u4ECE\u672C\u9875\u540C\u6B65");
      syncBtn.type = "button";
      syncBtn.disabled = busy;
      syncBtn.addEventListener("click", () => void syncFromPage());
      const cancelBtn = el("button", "ghost", "\u53D6\u6D88");
      cancelBtn.type = "button";
      cancelBtn.addEventListener("click", cancel);
      actions.append(confirmBtn, syncBtn, cancelBtn);
      panel.appendChild(actions);
      panel.appendChild(el("p", "hint", "\u4E0D\u4F1A\u70B9\u63D0\u4EA4\u3001\u9A8C\u8BC1\u7801\u6216\u767B\u5F55\u3002"));
    }
    if (phase === "done") {
      panel.appendChild(el("p", "okmsg", `\u5DF2\u5199\u5165\u672C\u9875 ${filledCount} \u9879\u3002\u8BF7\u4F60\u672C\u4EBA\u6838\u5BF9\u540E\u70B9\u9875\u9762\u4E0A\u7684\u63D0\u4EA4\u3002`));
      if (captured.length) {
        panel.appendChild(el("p", "okmsg", `\u5DF2\u8BB0\u5165\u6863\u6848 ${captured.length} \u9879\uFF1A${captured.map((item) => item.label).join("\u3001")}`));
      }
      const actions = el("div", "actions");
      const back = el("button", "ghost", "\u8FD4\u56DE");
      back.type = "button";
      back.addEventListener("click", cancel);
      actions.appendChild(back);
      panel.appendChild(actions);
    }
    shadow.appendChild(panel);
  }
  function addGroup(panel, title, items, missing) {
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
      input.placeholder = row.skipReason || "\u5728\u6B64\u586B\u5199";
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
  async function api(path, init) {
    const res = await fetch(`${SERVER}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers ?? {} }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "\u8BF7\u6C42\u5931\u8D25");
    return data;
  }
  async function scan() {
    error = "";
    phase = "idle";
    busy = true;
    render();
    try {
      const fields = extractFormSkeleton(document);
      if (!fields.length) throw new Error("\u672C\u9875\u6CA1\u6709\u53EF\u586B\u7684\u8F93\u5165\u6846\u3002");
      const data = await api("/ai/map-form", {
        method: "POST",
        body: JSON.stringify({
          fields,
          pageUrl: location.href,
          pageTitle: document.title
        })
      });
      plan = data;
      rows = (data.fields ?? []).map((row) => {
        const empty = !row.value.trim();
        return {
          ...row,
          wasMissing: empty,
          include: !empty,
          saveToProfile: empty && !row.skipReason?.startsWith("\u4E0D\u586B")
        };
      });
      phase = "review";
      highlightFillPlan(
        document,
        rows.map((row) => ({ id: row.id, confidence: row.confidence, empty: !row.value }))
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "\u9884\u586B\u5931\u8D25";
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
    error = n ? "" : "\u672C\u9875\u7F3A\u9879\u8FD8\u662F\u7A7A\u7684\u3002\u53EF\u4EE5\u5728\u9875\u9762\u4E0A\u586B\u5B8C\u518D\u70B9\u540C\u6B65\uFF0C\u6216\u76F4\u63A5\u5728\u4E0A\u9762\u8865\u3002";
    render();
  }
  async function confirmFill() {
    const selected = rows.filter((row) => row.include && row.value.trim()).map((row) => ({ id: row.id, value: row.value.trim() }));
    if (!selected.length) {
      error = "\u6CA1\u6709\u52FE\u9009\u8981\u5199\u5165\u7684\u9879\u3002";
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
        const items = rows.filter((row) => row.saveToProfile && row.value.trim() && !row.skipReason?.startsWith("\u4E0D\u586B")).map((row) => ({ id: row.id, label: row.label, value: row.value.trim(), source: row.source }));
        if (items.length) {
          const data = await api("/profiles/capture", {
            method: "POST",
            body: JSON.stringify({ profileId: plan?.profileId, resumeId: plan?.resumeId, items })
          });
          captured = data.applied ?? [];
        }
      }
      phase = "done";
    } catch (err) {
      error = err instanceof Error ? err.message : "\u5199\u5165\u5931\u8D25";
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
})();
