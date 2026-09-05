export const PREFILL_INJECT_URL = "http://127.0.0.1:8787/prefill-inject.js";

export function prefillBookmarklet(): string {
  return `javascript:void((async()=>{if(window.__qzPrefill){window.__qzPrefill();return}try{const r=await fetch("${PREFILL_INJECT_URL}");if(!r.ok)throw new Error("bad");(0,eval)(await r.text());window.__qzPrefill&&window.__qzPrefill()}catch(e){alert("无法连接秋招网申助手（127.0.0.1:8787）。请先运行本机服务。")}})())`;
}
