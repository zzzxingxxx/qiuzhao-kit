import {
  applyFillMappings,
  clearFillMarks,
  extractFormSkeleton,
  highlightFillPlan,
  readFilledValues,
} from "@qiuzhao/fill/dom";
import type { FillConfidence, FillFieldPlan, FormField } from "@qiuzhao/schema";

type ExtractOk = { ok: true; fields: FormField[]; title: string; href: string };
type ApplyOk = { ok: true; filled: string[]; skipped: string[]; submitUntouched: true };
type Fail = { ok: false; error: string };

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  main() {
    try {
      document.documentElement.setAttribute("data-qiuzhao-ext", "1");
    } catch {
      /* ignore */
    }
    browser.runtime.onMessage.addListener((msg: { type?: string; items?: unknown; fields?: unknown }, _sender, sendResponse) => {
      try {
        if (msg?.type === "QZ_EXTRACT") {
          const fields = extractFormSkeleton(document);
          const res: ExtractOk = {
            ok: true,
            fields,
            title: document.title,
            href: location.href,
          };
          sendResponse(res);
          return;
        }
        if (msg?.type === "QZ_HIGHLIGHT") {
          const items = Array.isArray(msg.items) ? (msg.items as { id: string; confidence?: FillConfidence; empty?: boolean }[]) : [];
          highlightFillPlan(document, items);
          sendResponse({ ok: true });
          return;
        }
        if (msg?.type === "QZ_APPLY") {
          const fields = Array.isArray(msg.fields) ? (msg.fields as Pick<FillFieldPlan, "id" | "value">[]) : [];
          const result = applyFillMappings(document, fields);
          const res: ApplyOk = { ok: true, ...result, submitUntouched: true };
          sendResponse(res);
          return;
        }
        if (msg?.type === "QZ_READ") {
          sendResponse({ ok: true, values: readFilledValues(document) });
          return;
        }
        if (msg?.type === "QZ_CLEAR") {
          clearFillMarks(document);
          sendResponse({ ok: true });
          return;
        }
      } catch (error) {
        const res: Fail = { ok: false, error: error instanceof Error ? error.message : "fill_failed" };
        sendResponse(res);
      }
    });
  },
});
