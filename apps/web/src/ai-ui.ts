import { ref, type Ref } from "vue";
import type { AiPatch, Resume } from "@qiuzhao/schema";

export const aiDrawerOpen = ref(false);
export const aiReady = ref(false);
export const activeResume: Ref<Resume | null> = ref(null);
export const applyAiPatch = ref<((patch: AiPatch) => void) | null>(null);
