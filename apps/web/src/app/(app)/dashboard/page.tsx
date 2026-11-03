"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranscripts, useDeleteTranscript, useUsage } from "@/hooks";
import { SUBSCRIPTION_PLANS } from "@/features/billing/plans";
import { gateway } from "@/lib/api-client";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Clock,
  MoreVertical,
  ExternalLink,
  Languages,
  ArrowRight,
  Mic,
  Upload,
  Sparkles,
  TrendingUp,
  BarChart3,
  Video,
  Calendar,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Transcript } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";
import { useSession } from "@/lib/auth-client";

interface UpcomingMeeting {
  id: string;
  title: string;
  startTime: string;
  platform: string | null;
  meetingUrl: string | null;
  botStatus: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Meet",
  teams: "Teams",
  webex: "Webex",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: transcripts = [], isLoading } = useTranscripts();
  const { data: usageData } = useUsage();
  const deleteMutation = useDeleteTranscript();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);

  // Fetch upcoming meetings for the card
  useEffect(() => {
    gateway.get<any>("/v1/calendar/events")
      .then((json) => {
        if (json?.data?.meetings) {
          setUpcomingMeetings(json.data.meetings.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] || "there";

  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) return transcripts;
    const query = searchQuery.toLowerCase();
    return transcripts.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.originalText.toLowerCase().includes(query)
    );
  }, [transcripts, searchQuery]);

  const totalWords = transcripts.reduce(
    (acc, t) => acc + (t.wordCount || 0),
    0
  );
  const uniqueLanguages = new Set(
    transcripts.map((t) => t.sourceLanguage || "en")
  );

  // Real usage data
  const currentPlanKey = (usageData?.subscription?.plan || "FREE") as keyof typeof SUBSCRIPTION_PLANS;
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanKey];
  const usedMinutes = usageData?.usage?.monthlyDictationMins || 0;
  const limitMinutes = currentPlan.monthlyLimit === Infinity ? Infinity : currentPlan.monthlyLimit;
  const usagePercent = limitMinutes === Infinity ? 0 : Math.min(100, (usedMinutes / limitMinutes) * 100);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Transcript deleted");
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
    } catch {
      toast.error("Failed to delete transcript");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 fade-up">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Welcome back, {firstName} 👋
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your transcription workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 border-0">
              <Plus className="mr-2 h-4 w-4" />
              New Dictation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="fade-up-1">
          <Card className="shadow-sm border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-orange-500/5 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-amber-600 dark:text-amber-400 font-medium text-xs uppercase tracking-wider">
                Total Transcripts
              </CardDescription>
              <FileText className="h-4 w-4 text-amber-500/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {transcripts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="fade-up-1">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="font-medium text-xs uppercase tracking-wider">
                Total Words
              </CardDescription>
              <BarChart3 className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {totalWords.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all transcripts
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="fade-up-2">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="font-medium text-xs uppercase tracking-wider">
                Languages Used
              </CardDescription>
              <Languages className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {Math.max(uniqueLanguages.size, 1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                18+ available
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="fade-up-2">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="font-medium text-xs uppercase tracking-wider">
                Usage This Month
              </CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                {usedMinutes}<span className="text-lg text-muted-foreground font-normal">/{limitMinutes === Infinity ? "∞" : limitMinutes}</span>
              </div>
              <div className="mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minutes used ({currentPlan.name} plan)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 fade-up-3">
        <Link href="/app">
          <Card className="group cursor-pointer hover:border-amber-500/30 hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Start Recording
                </p>
                <p className="text-xs text-muted-foreground">
                  Live dictation
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/upload">
          <Card className="group cursor-pointer hover:border-amber-500/30 hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Upload Audio
                </p>
                <p className="text-xs text-muted-foreground">
                  Batch transcribe
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={transcripts.length > 0 ? `/chat?transcriptId=${transcripts[0].id}` : "/chat"}>
          <Card className="group cursor-pointer hover:border-amber-500/30 hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  AI Chat
                </p>
                <p className="text-xs text-muted-foreground">
                  Ask about your meetings
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Meetings Card */}
      {upcomingMeetings.length > 0 && (
        <div className="fade-up-3">
          <Card className="shadow-sm border-amber-500/10 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <CardTitle className="text-base font-[family-name:var(--font-display)]">
                    Upcoming Meetings
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 font-normal"
                  >
                    {upcomingMeetings.length}
                  </Badge>
                </div>
                <Link href="/meetings">
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href="/meetings"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card hover:bg-muted/20 p-3 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(meeting.startTime), "EEE, MMM d 'at' h:mm a")}
                        {" · "}
                        {formatDistanceToNow(new Date(meeting.startTime), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {meeting.platform && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 font-normal"
                      >
                        {PLATFORM_LABELS[meeting.platform] || meeting.platform}
                      </Badge>
                    )}
                    {meeting.botStatus !== "idle" && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      >
                        <Bot className="h-2.5 w-2.5 mr-1" />
                        {meeting.botStatus}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transcripts Table */}
      <div className="fade-up-4">
        <Card className="shadow-sm overflow-hidden border-muted">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                Recent Transcripts
              </CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transcripts..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                <p className="mt-4 text-muted-foreground">
                  Loading transcripts...
                </p>
              </div>
            ) : filteredTranscripts.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-amber-500/50" />
                </div>
                <h3 className="text-lg font-semibold font-[family-name:var(--font-display)]">
                  {searchQuery ? "No results found" : "No transcripts yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto text-sm">
                  {searchQuery
                    ? `No transcripts match "${searchQuery}". Try a different search.`
                    : "Start dictating or upload an audio file to see your transcripts here."}
                </p>
                {!searchQuery && (
                  <Link href="/app">
                    <Button
                      variant="outline"
                      className="gap-2 hover:border-amber-500/30"
                    >
                      Start your first dictation{" "}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-6 w-[45%] sm:w-auto">Transcript</TableHead>
                    <TableHead className="hidden sm:table-cell w-[15%]">Language</TableHead>
                    <TableHead className="hidden sm:table-cell w-[12%]">Words</TableHead>
                    <TableHead className="w-[30%] sm:w-[18%]">Created</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-6 w-[25%] sm:w-[10%]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranscripts.map((transcript: Transcript) => (
                    <TableRow key={transcript.id} className="group">
                        <TableCell className="font-medium pl-4 sm:pl-6 py-3 sm:py-4">
                          <Link href={`/transcripts/${transcript.id}`} className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-sm truncate">
                                {transcript.title}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {transcript.originalText}
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="secondary"
                            className="bg-muted/50 font-normal text-xs"
                          >
                            <Languages className="mr-1 h-3 w-3" />
                            {transcript.sourceLanguage === "en" ? "English" : transcript.sourceLanguage}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {transcript.wordCount} words
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{format(
                              new Date(transcript.createdAt),
                              "MMM d, yyyy"
                            )}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/transcripts/${transcript.id}`}
                                  className="flex items-center cursor-pointer"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                                onClick={() => handleDelete(transcript.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
