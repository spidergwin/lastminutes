"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Loader2,
  CheckCircle2,
  Unplug,
  Link2,
  Bot,
  Video,
  RefreshCw,
  ArrowLeft,
  Settings2,
  Shield,
  Zap,
  HardDrive,
} from "lucide-react";
import Link from "next/link";

interface CalendarConnection {
  id: string;
  provider: string;
  email: string;
  enabled: boolean;
  connectedAt: string;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadToken, setUploadToken] = useState("");
  const [isSavingStorage, setIsSavingStorage] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const json = await gateway.get<any>("/v1/calendar/events");
      setConnections(json.data?.connections ?? []);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnect = () => {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    window.location.href = `${gatewayUrl}/v1/integrations/google/connect`;
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await gateway.delete<any>("/v1/calendar/disconnect", {
        body: JSON.stringify({ provider }),
      });
      setConnections((prev) => prev.filter((c) => c.provider !== provider));
      toast.success("Calendar disconnected");
    } catch {
      toast.error("Failed to disconnect calendar");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const json = await gateway.post<any>("/v1/calendar/sync");
      const botsScheduled = json.data?.botsScheduled ?? 0;
      toast.success(
        `Calendar synced! ${botsScheduled > 0 ? `${botsScheduled} bot(s) scheduled.` : ""}`
      );
    } catch {
      toast.error("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveStorage = async () => {
    setIsSavingStorage(true);
    try {
      await gateway.post<any>("/v1/user/storage", { token: uploadToken });
      toast.success("Storage settings updated");
    } catch {
      toast.error("Failed to update storage settings");
    } finally {
      setIsSavingStorage(false);
    }
  };

  const hasCalendar = connections.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-1 fade-up">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link
            href="/settings"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Integrations</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Integrations
        </h2>
        <p className="text-muted-foreground">
          Connect external services to enhance your meeting workflow.
        </p>
      </div>

      {/* Google Calendar */}
      <div className="fade-up-1">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Google Workspace</CardTitle>
                <CardDescription>
                  Connect your Google account to automatically sync calendar meetings
                  and upload large recordings directly to your Google Drive.
                </CardDescription>
              </div>
              {hasCalendar && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : hasCalendar ? (
              <div className="space-y-4">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{conn.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Connected{" "}
                          {format(new Date(conn.connectedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleSync}
                        disabled={isSyncing}
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`}
                        />
                        Sync Now
                      </Button>
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  No Google account connected yet.
                </p>
                <Button
                  onClick={handleConnect}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0 gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Connect Google Workspace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meeting Bot Configuration */}
      <div className="fade-up-2">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Meeting Bot</CardTitle>
                <CardDescription>
                  Automatically join and record your meetings with an AI
                  notetaker bot.
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              >
                <Zap className="h-3 w-3 mr-1" />
                Add-on
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
              {/* Bot display name */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Bot Display Name</p>
                  <p className="text-xs text-muted-foreground">
                    The name shown when the bot joins your meetings.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  Last Minutes Notetaker
                </Badge>
              </div>

              {/* Recording mode */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Recording Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Optimized for fast, accurate transcription.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Video className="h-3 w-3 mr-1" />
                  Optimized
                </Badge>
              </div>

              {/* Transcription quality */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Transcription Quality</p>
                  <p className="text-xs text-muted-foreground">
                    High-accuracy speaker-diarized transcription with
                    automatic speaker detection.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Settings2 className="h-3 w-3 mr-1" />
                  Advanced AI
                </Badge>
              </div>
            </div>

            {/* Info card about how it works */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    How the meeting bot works
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                    <li>Connect your calendar to detect upcoming meetings</li>
                    <li>
                      Enable &quot;Auto-join&quot; on meetings you want
                      transcribed
                    </li>
                    <li>
                      The bot joins at the scheduled time as a named participant
                    </li>
                    <li>
                      After the meeting, a full transcript with speaker labels
                      appears in your workspace
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supported Platforms */}
      <div className="fade-up-3">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Supported Platforms</CardTitle>
            <CardDescription>
              The meeting bot can join meetings on all major platforms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  name: "Zoom",
                  color:
                    "from-blue-500/10 to-blue-600/10 text-blue-600 dark:text-blue-400",
                },
                {
                  name: "Google Meet",
                  color:
                    "from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400",
                },
                {
                  name: "MS Teams",
                  color:
                    "from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400",
                },
                {
                  name: "Webex",
                  color:
                    "from-cyan-500/10 to-teal-500/10 text-cyan-600 dark:text-cyan-400",
                },
              ].map((platform) => (
                <div
                  key={platform.name}
                  className={`rounded-xl bg-gradient-to-br ${platform.color} border border-border/40 p-3 text-center`}
                >
                  <Video className="h-5 w-5 mx-auto mb-1.5" />
                  <p className="text-xs font-medium">{platform.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Custom Storage */}
      <div className="fade-up-4">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Custom Storage</CardTitle>
                <CardDescription>
                  Bring your own storage to host your transcribed files and recordings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="uploadToken">UploadThing Token (v7)</Label>
                <Input
                  id="uploadToken"
                  type="password"
                  value={uploadToken}
                  onChange={(e) => setUploadToken(e.target.value)}
                  placeholder="eyJ..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your UploadThing token starts with eyJ. Keep this secure.
                </p>
              </div>
              <Button
                onClick={handleSaveStorage}
                disabled={isSavingStorage}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white border-0 gap-2"
              >
                {isSavingStorage && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Storage Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
