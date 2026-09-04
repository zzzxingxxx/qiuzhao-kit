import { z } from "zod";

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "url",
  "other",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FILL_CONFIDENCE = ["high", "medium", "low"] as const;
export type FillConfidence = (typeof FILL_CONFIDENCE)[number];

export const formFieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(200).default(""),
  name: z.string().max(120).default(""),
  type: z.enum(FORM_FIELD_TYPES).default("text"),
  required: z.boolean().default(false),
  options: z.array(z.string().max(200)).max(80).default([]),
  placeholder: z.string().max(200).default(""),
  autocomplete: z.string().max(80).default(""),
});

export const fillFieldPlanSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(200).default(""),
  value: z.string().max(4000).default(""),
  source: z.string().max(200).default(""),
  confidence: z.enum(FILL_CONFIDENCE).default("low"),
  skipReason: z.string().max(200).optional(),
});

export const fillMissingSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(200),
  reason: z.string().max(200),
});

export const fillPlanSchema = z.object({
  fields: z.array(fillFieldPlanSchema).max(120),
  missingFields: z.array(fillMissingSchema).max(120).default([]),
  usedAi: z.boolean().default(false),
  needsKey: z.boolean().default(false),
  atsNote: z.string().max(40).optional(),
  warning: z.string().max(400).optional(),
  profileName: z.string().max(80).optional(),
  resumeRole: z.string().max(80).optional(),
});

export const mapFormRequestSchema = z.object({
  fields: z.array(formFieldSchema).min(1).max(120),
  pageUrl: z.string().max(2000).optional(),
  pageTitle: z.string().max(300).optional(),
  profileId: z.string().max(80).optional(),
  resumeId: z.string().max(80).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FillFieldPlan = z.infer<typeof fillFieldPlanSchema>;
export type FillMissingField = z.infer<typeof fillMissingSchema>;
export type FillPlan = z.infer<typeof fillPlanSchema>;
export type MapFormRequest = z.infer<typeof mapFormRequestSchema>;
