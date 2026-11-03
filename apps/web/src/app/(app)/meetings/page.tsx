"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  RefreshCw,
  Loader2,
  Video,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Unplug,
  ArrowRight,
  Bot,
  Radio,
  FileText,
  ExternalLink,
  Zap,
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
  platform: string | null;
  organizer: string | null;
  attendees: string[];
  autoJoinEnabled: boolean;
  botStatus: string;
  botError: string | null;
  transcriptId: string | null;
  transcript?: { id: string; title: string } | null;
}

interface CalendarConnection {
  id: string;
  provider: string;
  email: string;
  enabled: boolean;
  connectedAt: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  webex: "Webex",
};

const PLATFORM_COLORS: Record<string, string> = {
  zoom: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  google_meet: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  teams: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  webex: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: <Clock className="h-3 w-3" />, label: "Scheduled", color: "text-muted-foreground" },
  scheduled: { icon: <Bot className="h-3 w-3" />, label: "Bot Scheduled", color: "text-amber-600 dark:text-amber-400" },
  joining: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Joining...", color: "text-amber-600 dark:text-amber-400" },
  recording: { icon: <Radio className="h-3 w-3 animate-pulse" />, label: "Recording", color: "text-red-500" },
  processing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Processing...", color: "text-indigo-600 dark:text-indigo-400" },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed", color: "text-emerald-600 dark:text-emerald-400" },
  failed: { icon: <AlertCircle className="h-3 w-3" />, label: "Failed", color: "text-red-500" },
};

function formatMeetingDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <MeetingsPageContent />
    </Suspense>
  );
}

function MeetingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for successful integration connection
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Successfully connected calendar!");
      // Clean URL params
      router.replace("/meetings");
    } else if (status === "error") {
      toast.error("Failed to connect calendar.");
      router.replace("/meetings");
    }
  }, [searchParams]);

  // Fetch meetings on mount
  const fetchMeetings = useCallback(async () => {
    try {
      const json = await gateway.get<any>("/v1/calendar/events");
      setConnections(json.data?.connections ?? []);
      setMeetings(json.data?.meetings ?? []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Sync calendar events
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const json = await gateway.post<any>("/v1/calendar/sync");
      setMeetings(json.data?.meetings ?? []);
      toast.success("Calendar synced!");
    } catch {
      toast.error("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Connect Google Workspace
  const handleConnect = useCallback(() => {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${gatewayUrl}/v1/integrations/google/connect`;
  }, []);

  // Disconnect calendar
  const handleDisconnect = useCallback(async (provider: string) => {
    try {
      await gateway.delete<any>("/v1/calendar/disconnect", {
        body: JSON.stringify({ provider }),
      });
      setConnections((prev) => prev.filter((c) => c.provider !== provider));
      setMeetings([]);
      toast.success("Calendar disconnected");
    } catch {
      toast.error("Failed to disconnect calendar");
    }
  }, []);

  // Toggle auto-join
  const handleToggleAutoJoin = useCallback(async (meetingId: string, enabled: boolean) => {
    try {
      await gateway.patch<any>(`/v1/meetings/${meetingId}`, { autoJoinEnabled: enabled });
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, autoJoinEnabled: enabled } : m))
      );
      toast.success(enabled ? "Auto-join enabled" : "Auto-join disabled");
    } catch {
      toast.error("Failed to update setting");
    }
  }, []);

  // Send bot now
  const handleJoinNow = useCallback(async (meetingId: string) => {
    try {
      await gateway.post<any>("/v1/meetings", { meetingId });
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, botStatus: "joining" } : m))
      );
      toast.success("Bot is joining the meeting!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send bot");
    }
  }, []);

  const hasCalendar = connections.length > 0;
  const todaysMeetings = meetings.filter((m) => isToday(new Date(m.startTime)));
  const upcomingMeetings = meetings.filter((m) => !isToday(new Date(m.startTime)));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between fade-up">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Meetings
          </h2>
          <p className="text-muted-foreground">
            Connect your calendar and automatically transcribe your meetings.
          </p>
        </div>
        {hasCalendar && (
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
        )}
      </div>

      {/* Calendar Connection Card */}
      <div className="fade-up-1">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">Calendar Integration</CardTitle>
            </div>
            <CardDescription>
              Connect your Google Calendar to automatically detect meetings with Zoom, Google Meet, or Teams links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCalendar ? (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Google Calendar</p>
                        <p className="text-xs text-muted-foreground">{conn.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive gap-1.5"
                      onClick={() => handleDisconnect(conn.provider)}
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-sm font-medium mb-1">No Google account connected</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Connect your Google account to see your upcoming meetings
                </p>
                <Button
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Connect Google Workspace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meeting Bot Add-on Info */}
      {hasCalendar && (
        <div className="fade-up-2">
          <Card className="shadow-sm border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Meeting Bot Add-on</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable the meeting bot to automatically join and transcribe your meetings.
                    Toggle &quot;Auto-join&quot; on any meeting below to have the bot join and record it for you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Today's Meetings */}
      {!isLoading && hasCalendar && todaysMeetings.length > 0 && (
        <div className="fade-up-3">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">Today</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                  {todaysMeetings.length} meeting{todaysMeetings.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaysMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onToggleAutoJoin={handleToggleAutoJoin}
                  onJoinNow={handleJoinNow}
                  onViewTranscript={(id) => router.push(`/transcripts/${id}`)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Meetings */}
      {!isLoading && hasCalendar && upcomingMeetings.length > 0 && (
        <div className="fade-up-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">Upcoming</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                  {upcomingMeetings.length} meeting{upcomingMeetings.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onToggleAutoJoin={handleToggleAutoJoin}
                  onJoinNow={handleJoinNow}
                  onViewTranscript={(id) => router.push(`/transcripts/${id}`)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && hasCalendar && meetings.length === 0 && (
        <div className="fade-up-3">
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="py-12 text-center">
              <Video className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No upcoming meetings</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Your calendar doesn&apos;t have any meetings with Zoom, Google Meet, or Teams links in the next 7 days.
              </p>
              <Button onClick={handleSync} variant="outline" size="sm" className="mt-4 gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============= Meeting Card Component =============

function MeetingCard({
  meeting,
  onToggleAutoJoin,
  onJoinNow,
  onViewTranscript,
}: {
  meeting: Meeting;
  onToggleAutoJoin: (id: string, enabled: boolean) => void;
  onJoinNow: (id: string) => void;
  onViewTranscript: (id: string) => void;
}) {
  const status = STATUS_CONFIG[meeting.botStatus] || STATUS_CONFIG.idle;
  const isActive = ["joining", "recording", "processing"].includes(meeting.botStatus);
  const isCompleted = meeting.botStatus === "completed";
  const isFailed = meeting.botStatus === "failed";
  const startsIn = formatDistanceToNow(new Date(meeting.startTime), { addSuffix: true });
  const isMeetingStartingSoon =
    new Date(meeting.startTime).getTime() - Date.now() < 10 * 60 * 1000; // within 10 minutes

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isActive
          ? "border-amber-500/30 bg-amber-500/5"
          : isCompleted
            ? "border-emerald-500/20 bg-emerald-500/5"
            : isFailed
              ? "border-red-500/20 bg-red-500/5"
              : "border-border/60 bg-card hover:bg-muted/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title + Platform */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold truncate">{meeting.title}</h3>
            {meeting.platform && (
              <Badge
                variant="secondary"
                className={`text-[10px] px-2 py-0.5 font-normal shrink-0 ${
                  PLATFORM_COLORS[meeting.platform] || ""
                }`}
              >
                <Video className="h-2.5 w-2.5 mr-1" />
                {PLATFORM_LABELS[meeting.platform] || meeting.platform}
              </Badge>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span>{formatMeetingDate(meeting.startTime)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="capitalize">{startsIn}</span>
          </div>

          {/* Attendees */}
          {meeting.attendees.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Users className="h-3 w-3" />
              <span>
                {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Bot Status */}
          {meeting.botStatus !== "idle" && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 ${status.color}`}>
              {status.icon}
              <span className="font-medium">{status.label}</span>
              {meeting.botError && (
                <span className="text-red-500/70 truncate max-w-[200px]">
                  — {meeting.botError}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && meeting.transcriptId && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => onViewTranscript(meeting.transcriptId!)}
            >
              <FileText className="h-3 w-3" />
              View Transcript
            </Button>
          )}

          {!isActive && !isCompleted && meeting.meetingUrl && (
            <>
              {isMeetingStartingSoon && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                  onClick={() => onJoinNow(meeting.id)}
                >
                  <Bot className="h-3 w-3" />
                  Send Bot
                </Button>
              )}

              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground whitespace-nowrap">
                  Auto-join
                </label>
                <Switch
                  checked={meeting.autoJoinEnabled}
                  onCheckedChange={(checked) => onToggleAutoJoin(meeting.id, checked)}
                  className="scale-75"
                />
              </div>
            </>
          )}

          {meeting.meetingUrl && !isActive && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => window.open(meeting.meetingUrl!, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
