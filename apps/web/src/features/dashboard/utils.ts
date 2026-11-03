// Dashboard feature exports

export interface DashboardStats {
  totalTranscripts: number;
  totalWords: number;
  totalDuration: number; // seconds
  mostUsedLanguage: string;
  recentTranscripts: Array<{
    id: string;
    title: string;
    createdAt: Date;
    wordCount: number;
  }>;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  // This would be a database query
  return {
    totalTranscripts: 0,
    totalWords: 0,
    totalDuration: 0,
    mostUsedLanguage: "en",
    recentTranscripts: [],
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
  subscription?: {
    plan: string;
    status: string;
    monthlyLimit: number;
  };
  usage?: {
    monthlyDictationMins: number;
    monthlyUploadMins: number;
    monthlyTranslations: number;
  };
}

export function calculateUsagePercentage(
  used: number,
  limit: number
): number {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

export function isUsageExceeded(
  used: number,
  limit: number
): boolean {
  return limit > 0 && used >= limit;
}
