import { z } from "zod";

// ============= Auth Schemas =============

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// ============= Transcript Schemas =============

export const createTranscriptSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  originalText: z.string().min(1, "Text is required"),
  translatedText: z.string().optional(),
  sourceLanguage: z.string().default("en"),
  targetLanguage: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileType: z.enum(["audio", "video", "dictation", "url"]).default("dictation"),
  segments: z.array(z.any()).optional(),   // Speaker-diarized utterances
  speakers: z.array(z.string()).optional(), // Unique speaker labels
  duration: z.number().optional(),          // Audio duration in seconds
});

export const updateTranscriptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  originalText: z.string().min(1).optional(),
  translatedText: z.string().optional(),
  targetLanguage: z.string().optional(),
  isPublic: z.boolean().optional(),
  segments: z.array(z.any()).optional(),
  speakers: z.array(z.string()).optional(),
  duration: z.number().optional(),
});

export type CreateTranscriptInput = z.infer<typeof createTranscriptSchema>;
export type UpdateTranscriptInput = z.infer<typeof updateTranscriptSchema>;

// ============= File Upload Schemas =============

export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, "Must be a file"),
  targetLanguage: z.string().optional(),
});

export const fileValidation = {
  maxSize: 2 * 1024 * 1024 * 1024, // 2GB
  allowedAudioTypes: ["audio/mpeg", "audio/wav", "audio/mp4"],
  allowedVideoTypes: ["video/mp4", "video/webm"],
  getAllowedTypes() {
    return [...this.allowedAudioTypes, ...this.allowedVideoTypes];
  },
};

// ============= Translation Schemas =============

export const translateSchema = z.object({
  text: z.string().nullish().transform(val => val || ""),
  sourceLang: z.string().nullish().transform(val => val || "en"),
  targetLang: z.string(),
});

export const batchTranslateSchema = z.object({
  texts: z.array(z.string()).min(1),
  sourceLang: z.string().nullish().transform(val => val || "en"),
  targetLang: z.string(),
});

export type TranslateInput = z.infer<typeof translateSchema>;
export type BatchTranslateInput = z.infer<typeof batchTranslateSchema>;

// ============= Language Meta =============

export const SUPPORTED_LANGUAGES = {
  en: "English",
  fr: "French",
  es: "Spanish",
  ha: "Hausa (Coming Soon)",
  yo: "Yoruba (Coming Soon)",
  ig: "Igbo (Coming Soon)",
  pid: "Nigerian Pidgin (Coming Soon)",
  multi: "Multi-language (Code-switching - Coming Soon)",
} as const;

export const NIGERIAN_LANGUAGES = ["ha", "yo", "ig", "pid"] as const;

// ============= API Response Schemas =============

export const userRoleSchema = z.enum(["USER", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable().optional(),
  emailVerified: z.boolean().default(false),
  role: userRoleSchema.default("USER"),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type User = z.infer<typeof userSchema>;

export const transcriptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  originalText: z.string(),
  translatedText: z.string().nullable().optional(),
  sourceLanguage: z.string().default("en"),
  targetLanguage: z.string().nullable().optional(),
  duration: z.number(),
  wordCount: z.number().default(0),
  fileUrl: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  segments: z.array(z.any()).nullable().optional(),   // Speaker-diarized utterances
  speakers: z.array(z.string()).nullable().optional(), // Unique speaker labels
  transcribedAt: z.union([z.string(), z.date()]),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  isPublic: z.boolean().default(false),
  summaries: z.array(z.any()).optional(),
});

export type Transcript = z.infer<typeof transcriptSchema>;

export const summarySchema = z.object({
  id: z.string(),
  transcriptId: z.string(),
  type: z.enum(["EXECUTIVE_SUMMARY", "ACTION_ITEMS", "KEY_DECISIONS", "MEETING_NOTES", "CUSTOM"]),
  content: z.string(),
  metadata: z.any().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type Summary = z.infer<typeof summarySchema>;

export const adminStatsSchema = z.object({
  totalUsers: z.number(),
  newUsersToday: z.number().optional(),
  activeUsers: z.number(),
  activeSubscriptions: z.number().optional(),
  totalTranscripts: z.number(),
  totalDurationSeconds: z.number(),
  usageTrend: z.array(
    z.object({
      date: z.string(),
      transcripts: z.number(),
    })
  ),
  topLanguages: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      count: z.number(),
    })
  ),
  recentAuditLogs: z.array(z.any()).optional(),
});

export type AdminStats = z.infer<typeof adminStatsSchema>;

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type APIResponse<T = unknown> = z.infer<typeof apiResponseSchema> & {
  data?: T;
};
