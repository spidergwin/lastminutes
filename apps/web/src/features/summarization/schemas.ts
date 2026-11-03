import { z } from "zod";

export const SummaryTypeEnum = z.enum([
  "EXECUTIVE_SUMMARY",
  "ACTION_ITEMS",
  "KEY_DECISIONS",
  "MEETING_NOTES",
  "CUSTOM"
]);

export type SummaryType = z.infer<typeof SummaryTypeEnum>;

export const actionItemSchema = z.object({
  task: z.string(),
  assignee: z.string().optional(),
  deadline: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
});

export const keyDecisionSchema = z.object({
  decision: z.string(),
  rationale: z.string().optional(),
  impact: z.string().optional(),
});

export const meetingNotesSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  topics: z.array(
    z.object({
      topic: z.string(),
      discussionPoints: z.array(z.string()),
    })
  ),
});

export const executiveSummarySchema = z.object({
  overview: z.string(),
  keyTakeaways: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

// Used for API request validation
export const generateSummaryRequestSchema = z.object({
  transcriptId: z.string(),
  type: SummaryTypeEnum,
  customPrompt: z.string().optional(),
});
