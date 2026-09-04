import type { FillConfidence, FillFieldPlan, FormField, FormFieldType } from "@qiuzhao/schema";

const SKIP_INPUT_TYPES = new Set([
  "password",
  "hidden",
  "file",
  "submit",
  "button",
  "reset",
  "image",
  "color",
  "range",
]);

const STYLE_ID = "qz-fill-style";

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[*＊:：]/g, "").trim().slice(0, 80);
}

function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}

function looksLikeCaptcha(el: HTMLElement, label: string): boolean {
  const hay = `${label} ${el.getAttribute("name") ?? ""} ${el.id} ${el.getAttribute("placeholder") ?? ""}`.toLowerCase();
  return /验证码|captcha|vcode|verifycode|sms.?code/.test(hay);
}

function controlType(el: HTMLElement): FormFieldType {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
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

function resolveLabel(el: HTMLElement): string {
  const doc = el.ownerDocument;
  if (el.id) {
    const lab = doc.querySelector(`label[for="${cssEscape(el.id)}"]`);
    if (lab?.textContent) {
      const text = cleanText(lab.textContent);
      if (text) return text;
    }
  }
  const aria = el.getAttribute("aria-label");
  if (aria) return cleanText(aria);
  const labelled = el.getAttribute("aria-labelledby");
  if (labelled) {
    const text = cleanText(
      labelled
        .split(/\s+/)
        .map((id) => doc.getElementById(id)?.textContent ?? "")
        .join(" "),
    );
    if (text) return text;
  }
  let node: HTMLElement | null = el;
  for (let i = 0; i < 6 && node && node !== doc.body; i++) {
    const prev = node.previousElementSibling;
    if (prev && !prev.matches("input, select, textarea, button")) {
      const clone = prev.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("input,select,textarea,button").forEach((child) => child.remove());
      const text = cleanText(clone.textContent ?? "");
      if (text && text.length < 40) return text;
    }
    node = node.parentElement;
  }
  const closest = el.closest("label");
  if (closest) {
    const clone = closest.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("input,select,textarea,button").forEach((child) => child.remove());
    const text = cleanText(clone.textContent ?? "");
    if (text) return text;
  }
  return cleanText(el.getAttribute("placeholder") ?? el.getAttribute("name") ?? "");
}

function optionLabel(el: HTMLInputElement): string {
  const closest = el.closest("label");
  if (closest) {
    const clone = closest.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("input").forEach((node) => node.remove());
    const text = cleanText(clone.textContent ?? "");
    if (text) return text;
  }
  return el.value || resolveLabel(el);
}

function collectOptions(el: HTMLElement): string[] {
  if (el instanceof HTMLSelectElement) {
    return [...el.options]
      .map((opt) => cleanText(opt.text || opt.value))
      .filter((text) => text && text !== "请选择");
  }
  if (el instanceof HTMLInputElement && el.type === "radio" && el.name) {
    const group = el.ownerDocument.querySelectorAll(`input[type="radio"][name="${cssEscape(el.name)}"]`);
    return [...group].map((node) => optionLabel(node as HTMLInputElement)).filter(Boolean);
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    return ["是", "否"];
  }
  return [];
}

function nativeSet(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc?.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function truthy(value: string): boolean {
  return /^(1|true|yes|y|是|有|对)$/i.test(value.trim());
}

export function extractFormSkeleton(doc: Document = document): FormField[] {
  const controls = doc.querySelectorAll("input, textarea, select");
  const fields: FormField[] = [];
  const seenRadio = new Set<string>();
  let index = 0;
  for (const node of controls) {
    if (!(node instanceof HTMLElement)) continue;
    if (!isVisible(node)) continue;
    if (node instanceof HTMLInputElement && SKIP_INPUT_TYPES.has((node.type || "").toLowerCase())) continue;
    if ((node as HTMLInputElement).disabled) continue;
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
      node.ownerDocument
        .querySelectorAll(`input[type="radio"][name="${cssEscape(node.name)}"]`)
        .forEach((radio) => radio.setAttribute("data-qz-id", id));
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
      autocomplete: node.getAttribute("autocomplete") ?? "",
    });
  }
  return fields;
}

export function applyFillMappings(
  doc: Document,
  mappings: Pick<FillFieldPlan, "id" | "value">[],
): { filled: string[]; skipped: string[] } {
  const filled: string[] = [];
  const skipped: string[] = [];
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
    const el = nodes[0];
    if (!(el instanceof HTMLElement)) {
      skipped.push(item.id);
      continue;
    }
    if (el instanceof HTMLInputElement && SKIP_INPUT_TYPES.has((el.type || "").toLowerCase())) {
      skipped.push(item.id);
      continue;
    }
    if (el instanceof HTMLSelectElement) {
      const matched =
        [...el.options].find((opt) => (opt.text || opt.value).trim() === value) ??
        [...el.options].find((opt) => {
          const t = (opt.text || opt.value).trim();
          return t.includes(value) || value.includes(t);
        });
      if (matched) el.value = matched.value;
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push(item.id);
      continue;
    }
    if (el instanceof HTMLInputElement && el.type === "radio") {
      const hit =
        nodes.find((node) => node instanceof HTMLInputElement && (node.value === value || optionLabel(node) === value)) ??
        nodes.find(
          (node) =>
            node instanceof HTMLInputElement &&
            (optionLabel(node).includes(value) || value.includes(optionLabel(node))),
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
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      el.checked = truthy(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push(item.id);
      continue;
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      nativeSet(el, value);
      filled.push(item.id);
      continue;
    }
    skipped.push(item.id);
  }
  return { filled, skipped };
}

export function highlightFillPlan(
  doc: Document,
  items: { id: string; confidence?: FillConfidence; empty?: boolean }[],
) {
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

export function clearFillMarks(doc: Document) {
  doc.querySelectorAll("[data-qz-id]").forEach((node) => {
    node.classList.remove("qz-fill-high", "qz-fill-medium", "qz-fill-missing");
  });
}

function ensureStyle(doc: Document) {
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
