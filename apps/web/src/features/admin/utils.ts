// Admin feature utilities

export enum AdminAction {
  USER_CREATED = "USER_CREATED",
  USER_SUSPENDED = "USER_SUSPENDED",
  USER_DELETED = "USER_DELETED",
  SUBSCRIPTION_UPGRADED = "SUBSCRIPTION_UPGRADED",
  TRANSCRIPTION_DELETED = "TRANSCRIPTION_DELETED",
  REPORT_GENERATED = "REPORT_GENERATED",
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTranscripts: number;
  totalDurationSeconds: number;
  topLanguages: Array<{
    code: string;
    name: string;
    count: number;
  }>;
  usageTrend: Array<{
    date: string;
    transcripts: number;
    translations: number;
  }>;
}

export interface UserAction {
  userId: string;
  action: AdminAction;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export async function logAdminAction(
  userId: string,
  action: AdminAction,
  details?: Record<string, unknown>
): Promise<void> {
  // This would log to database
  console.log({
    userId,
    action,
    timestamp: new Date().toISOString(),
    details,
  });
}

export function canPerformAdminAction(
  userRole: "USER" | "ADMIN",
  action: AdminAction
): boolean {
  const adminOnlyActions = [
    AdminAction.USER_SUSPENDED,
    AdminAction.USER_DELETED,
    AdminAction.REPORT_GENERATED,
  ];

  if (adminOnlyActions.includes(action)) {
    return userRole === "ADMIN";
  }

  return true;
}

export function formatAdminStatsForDisplay(stats: AdminStats) {
  return {
    ...stats,
    activeUserPercentage: Math.round(
      (stats.activeUsers / stats.totalUsers) * 100
    ),
    averageTranscriptLength: Math.round(
      stats.totalDurationSeconds / (stats.totalTranscripts || 1)
    ),
  };
}
