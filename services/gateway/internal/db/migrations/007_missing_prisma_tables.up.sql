-- Mirrored tables for Next.js Prisma compatibility

CREATE TABLE IF NOT EXISTS "Usage" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "monthlyDictationMins" INTEGER NOT NULL DEFAULT 0,
    "monthlyUploadMins" INTEGER NOT NULL DEFAULT 0,
    "monthlyTranslations" INTEGER NOT NULL DEFAULT 0,
    "totalDictationMins" INTEGER NOT NULL DEFAULT 0,
    "totalUploadMins" INTEGER NOT NULL DEFAULT 0,
    "totalTranslations" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeId" TEXT UNIQUE,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMPTZ,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 0,
    "trialEndsAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TranslationStat" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "translationTime" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SystemLog" (
    "id" TEXT PRIMARY KEY,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "service" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GoogleDriveConnection" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMPTZ,
    "email" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: Thread and Message are handled by Go, but Prisma might need them.
-- We'll keep them as they are or use UUIDs if Go owns them.
-- In Phase 4 I didn't create Thread/Message tables. 
-- Let's create them with TEXT IDs to match Prisma source.

CREATE TABLE IF NOT EXISTS "Thread" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "transcriptId" TEXT, -- Can be UUID or TEXT depending on owner
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT PRIMARY KEY,
    "threadId" TEXT NOT NULL REFERENCES "Thread"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Usage_userId_idx" ON "Usage"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "TranslationStat_userId_idx" ON "TranslationStat"("userId");
CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "Thread_userId_idx" ON "Thread"("userId");
CREATE INDEX IF NOT EXISTS "Message_threadId_idx" ON "Message"("threadId");

-- Triggers
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON "Usage" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_updated_at BEFORE UPDATE ON "Subscription" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_googledrive_updated_at BEFORE UPDATE ON "GoogleDriveConnection" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_thread_updated_at BEFORE UPDATE ON "Thread" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
