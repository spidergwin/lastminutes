"use client";

import { use, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranscript, useDeleteTranscript, useSummarize, useUpdateTranscript, useTranslate, useDeleteSummary } from "@/hooks";
import { isMeetingTranscript, normalizeSpeakerLabel } from "@/lib/format-transcript";
import { Summary } from "@/lib/validations";

const TranscriptEditor = dynamic(
  () => import('@/components/transcript-editor').then(mod => ({ default: mod.TranscriptEditor })),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" /></div> }
);
const MeetingTranscriptView = dynamic(
  () => import('@/components/meeting-transcript-view').then(mod => ({ default: mod.MeetingTranscriptView })),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" /></div> }
);
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { SUPPORTED_LANGUAGES } from "@/features/translation/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Copy,
  Download,
  Trash2,
  FileText,
  Clock,
  Languages,
  Sparkles,
  Loader2,
  Pencil,
  Check,
  X,
  BarChart3,
  MessageSquare,
  Type,
  Users,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { SummaryRenderer } from "@/components/summary-renderer";
import Link from "next/link";

export default function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: transcript, isLoading, error } = useTranscript(id);
  const deleteMutation = useDeleteTranscript();
  const summarizeMutation = useSummarize();
  const translateMutation = useTranslate();
  const updateMutation = useUpdateTranscript();
  const deleteSummaryMutation = useDeleteSummary();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [summaryType, setSummaryType] = useState<string>("EXECUTIVE_SUMMARY");
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string>("fr");
  const [viewMode, setViewMode] = useState<"original" | "translated">("original");
  const [translatedSegments, setTranslatedSegments] = useState<any[] | null>(null);
  const [translateState, setTranslateState] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateProgress, setTranslateProgress] = useState<string>("");

  // Meeting detection — auto-select conversation view when speakers data exists
  const hasMeetingData = useMemo(
    () => isMeetingTranscript(transcript?.speakers as string[] | undefined),
    [transcript?.speakers]
  );

  const displaySegments = useMemo(() => {
    const segs = (transcript?.segments as any[]) ?? [];
    if (viewMode === "translated") {
      if (translatedSegments) {
        return translatedSegments;
      }
      return segs.map(seg => ({
        ...seg,
        text: seg.translatedText || seg.text
      }));
    }
    return segs.map(seg => ({
      ...seg,
      text: seg.originalText || seg.text
    }));
  }, [viewMode, translatedSegments, transcript?.segments]);

  const handleCopy = useCallback(() => {
    if (transcript?.originalText) {
      navigator.clipboard.writeText(transcript.originalText);
      toast.success("Copied to clipboard");
    }
  }, [transcript]);

  const handleDownload = useCallback(() => {
    if (!transcript) return;
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(transcript.originalText)
    );
    element.setAttribute("download", `${transcript.title}-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Downloaded");
  }, [transcript]);

  const handleExport = useCallback(
    (format: string) => {
      if (!transcript) return;
      window.open(`/api/export/${transcript.id}?format=${format}`, "_blank");
    },
    [transcript]
  );

  const handleDelete = async () => {
    if (!transcript) return;
    if (!confirm("Are you sure you want to delete this transcript?")) return;
    try {
      await deleteMutation.mutateAsync(transcript.id);
      toast.success("Transcript deleted");
      queryClient.invalidateQueries({ queryKey: ["transcripts"] });
      router.push("/transcripts");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSaveTitle = async () => {
    if (!transcript || !editTitle.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: transcript.id,
        data: { title: editTitle.trim() },
      });
      queryClient.invalidateQueries({ queryKey: ["transcript", id] });
      setIsEditingTitle(false);
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const handleSummarize = async () => {
    if (!transcript) return;
    setSummaryState("processing");
    setSummaryError(null);
    try {
      const result = await summarizeMutation.mutateAsync({
        transcriptId: transcript.id,
        type: summaryType as any,
      });
      setSummaryResult(result.data?.result || result.data);
      setSummaryState("completed");
      queryClient.invalidateQueries({ queryKey: ["transcript", id] });
    } catch (err: any) {
      setSummaryError(err.message || "Failed to generate summary");
      setSummaryState("error");
    }
  };

  const handleDeleteSummary = async (summaryId: string) => {
    if (!confirm("Are you sure you want to delete this summary?")) return;
    try {
      await deleteSummaryMutation.mutateAsync(summaryId);
      queryClient.invalidateQueries({ queryKey: ["transcript", id] });
      toast.success("Summary deleted");
    } catch {
      toast.error("Failed to delete summary");
    }
  };

  const handleTranslate = async () => {
    if (!transcript) return;
    setTranslateState("processing");
    setTranslateError(null);
    setTranslateProgress("Translating main text...");
    try {
      // 1. Translate the main text
      const result = await translateMutation.mutateAsync({
        text: transcript.originalText,
        sourceLang: transcript.sourceLanguage,
        targetLang,
      });
      
      const translatedText = result.data.translatedText;
      let newSegments = null;

      // 2. If it's a meeting, we need to translate segments too
      if (hasMeetingData && transcript.segments && Array.isArray(transcript.segments)) {
        const segs = transcript.segments as any[];
        const segmentsResult = [];
        
        for (let i = 0; i < segs.length; i++) {
          setTranslateProgress(`Translating segment ${i + 1} of ${segs.length}...`);
          const seg = segs[i];
          const segmentText = seg.originalText || seg.text;
          if (!segmentText || segmentText.trim() === "") {
            segmentsResult.push({ ...seg, text: "", originalText: "" });
            continue;
          }
          const transResult = await translateMutation.mutateAsync({
            text: segmentText,
            sourceLang: transcript.sourceLanguage,
            targetLang,
          });
          segmentsResult.push({ 
            ...seg, 
            originalText: segmentText,
            translatedText: transResult.data.translatedText 
          });
        }
        
        newSegments = segmentsResult;
        setTranslatedSegments(newSegments.map(s => ({
          ...s,
          text: s.translatedText || s.text
        })));
      }
      
      setTranslateProgress("Saving translation...");
      // Save translation to transcript
      await updateMutation.mutateAsync({
        id: transcript.id,
        data: { 
          translatedText, 
          targetLanguage: targetLang,
          ...(newSegments && { segments: newSegments }) // Update segments too if we have them
        },
      });
      
      setTranslateState("completed");
      queryClient.invalidateQueries({ queryKey: ["transcript", id] });
      toast.success("Translation complete");
    } catch (error: any) {
      console.error("Translation error:", error);
      setTranslateError(error.message || "Failed to translate transcript");
      setTranslateState("error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Transcript not found</p>
        <Link href="/transcripts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Transcripts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 fade-up">
        <div className="flex items-center gap-3">
          <Link href="/transcripts">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 text-lg font-bold w-64"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
                  {transcript.title}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditTitle(transcript.title);
                    setIsEditingTitle(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(transcript.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/chat?transcriptId=${transcript.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800/30 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="h-3.5 w-3.5" /> AI Chat
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800/30"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0 w-full fade-up-1">
          {/* Audio Player */}
          {transcript.fileUrl && (
            <AudioPlayer url={transcript.fileUrl} />
          )}

          {/* Transcript — Conversation View or Editor */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {hasMeetingData ? (
                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <CardTitle className="text-base">
                    {hasMeetingData ? 'Meeting Transcript' : 'Transcript'}
                  </CardTitle>
                  {hasMeetingData && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                      <Users className="h-2.5 w-2.5" />
                      {(transcript.speakers as string[])?.length} speakers
                    </Badge>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  {transcript.translatedText && (
                    <div className="flex items-center bg-muted rounded-md p-1 border">
                      <Button
                        variant={viewMode === "original" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setViewMode("original")}
                      >
                        Original
                      </Button>
                      <Button
                        variant={viewMode === "translated" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setViewMode("translated")}
                      >
                        {SUPPORTED_LANGUAGES[transcript.targetLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name || "Translated"}
                      </Button>
                    </div>
                  )}
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Languages className="mr-1 h-3 w-3" />
                    {SUPPORTED_LANGUAGES[transcript.sourceLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name || "English"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hasMeetingData ? (
                <MeetingTranscriptView
                  segments={displaySegments}
                  speakers={(transcript.speakers as string[]) ?? []}
                  duration={transcript.duration || undefined}
                  onRenameSpeaker={async (oldName, newName) => {
                    const newSpeakers = (transcript.speakers as string[]).map(s => 
                      normalizeSpeakerLabel(s) === oldName ? newName : s
                    );
                    const newSegments = (transcript.segments as any[]).map(seg => 
                      normalizeSpeakerLabel(seg.speaker) === oldName ? { ...seg, speaker: newName } : seg
                    );
                    
                    const newOriginalText = newSegments
                      .map(seg => `${normalizeSpeakerLabel(seg.speaker)}: ${seg.originalText || seg.text}`)
                      .join('\n\n');
                    
                    await updateMutation.mutateAsync({
                      id: transcript.id,
                      data: { speakers: newSpeakers, segments: newSegments, originalText: newOriginalText }
                    });
                    queryClient.invalidateQueries({ queryKey: ["transcript", transcript.id] });
                  }}
                  onEditSegmentText={async (index, newText) => {
                    const newSegments = [...(transcript.segments as any[])];
                    const seg = newSegments[index];
                    newSegments[index] = { 
                      ...seg, 
                      text: newText, 
                      originalText: newText 
                    };
                    
                    const newOriginalText = newSegments
                      .map(seg => `${normalizeSpeakerLabel(seg.speaker)}: ${seg.originalText || seg.text}`)
                      .join('\n\n');
                    
                    await updateMutation.mutateAsync({
                      id: transcript.id,
                      data: { segments: newSegments, originalText: newOriginalText }
                    });
                    queryClient.invalidateQueries({ queryKey: ["transcript", transcript.id] });
                  }}
                />
              ) : viewMode === "translated" ? (
                <TranscriptEditor
                  initialContent={transcript.translatedText || ""}
                  onSave={async () => {}}
                  readOnly={true}
                />
              ) : (
                <TranscriptEditor
                  initialContent={transcript.originalText}
                  onSave={async (content: string) => {
                    await updateMutation.mutateAsync({
                      id: transcript.id,
                      data: { originalText: content },
                    });
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* AI Summary Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">AI Summary & Insights</CardTitle>
              </div>
              <CardDescription>Generate or view AI-powered insights for this transcript.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Select value={summaryType} onValueChange={setSummaryType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXECUTIVE_SUMMARY">Executive Summary</SelectItem>
                    <SelectItem value="ACTION_ITEMS">Action Items</SelectItem>
                    <SelectItem value="KEY_DECISIONS">Key Decisions</SelectItem>
                    <SelectItem value="MEETING_NOTES">Meeting Notes</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSummarize}
                  disabled={summaryState === "processing"}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
                >
                  {summaryState === "processing" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>

              {/* Processing State */}
              {summaryState === "processing" && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-end gap-[2px] h-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-[2.5px] bg-amber-500 rounded-full animate-wave origin-bottom"
                        style={{
                          height: `${Math.random() * 60 + 40}%`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: `${0.6 + Math.random() * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generating AI summary...</p>
                    <p className="text-xs text-muted-foreground">This may take a moment based on the transcript length.</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {summaryState === "error" && summaryError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Failed to generate summary
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                        {summaryError}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={handleSummarize} className="gap-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Display existing summaries */}
              {(transcript.summaries && transcript.summaries.length > 0) && (
                <div className="space-y-4 pt-2">
                  {([...(transcript.summaries as Summary[])])?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((summary) => (
                    <div key={summary.id} className="rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{summary.type.replace('_', ' ')}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(summary.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="text-sm">
                        <SummaryRenderer 
                          content={summary.content} 
                          type={summary.type} 
                          onDelete={() => handleDeleteSummary(summary.id)}
                          isDeleting={deleteSummaryMutation.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Metadata & Export */}
        <div className="space-y-6 fade-up-2">
          {/* Metadata */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Words", value: transcript.wordCount?.toLocaleString() || "0" },
                {
                  label: "Duration",
                  value: transcript.duration
                    ? `${Math.floor(transcript.duration / 60)}m ${transcript.duration % 60}s`
                    : "—",
                },
                {
                  label: "Language",
                  value:
                    SUPPORTED_LANGUAGES[transcript.sourceLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name || transcript.sourceLanguage,
                },
                { label: "Type", value: hasMeetingData ? "meeting" : (transcript.fileType || "dictation") },
                ...(hasMeetingData ? [{ label: "Speakers", value: `${(transcript.speakers as string[])?.length || 0} detected` }] : []),
                {
                  label: "Created",
                  value: format(new Date(transcript.createdAt), "MMM d, yyyy"),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium capitalize">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Export */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">Export</CardTitle>
              </div>
              <CardDescription>Download in your preferred format.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Plain Text", format: "txt" },
                  { label: "PDF", format: "pdf" },
                  { label: "Word", format: "docx" },
                  { label: "JSON", format: "json" },
                  { label: "SRT", format: "srt" },
                  { label: "VTT", format: "vtt" },
                ].map(({ label, format }) => (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs"
                    onClick={() => handleExport(format)}
                  >
                    <Download className="mr-1.5 h-3 w-3" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Translation */}
          <Card className="shadow-sm border-amber-200 dark:border-amber-800/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">Translate</CardTitle>
              </div>
              <CardDescription>Translate the entire transcript to another language.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Target Language</span>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_LANGUAGES)
                      .filter(([code]) => code !== transcript.sourceLanguage)
                      .map(([code, { name }]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={handleTranslate}
                disabled={translateState === "processing"}
              >
                {translateState === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                Translate Transcript
              </Button>

              {/* Translation Processing State */}
              {translateState === "processing" && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-end gap-[2px] h-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-[2.5px] bg-amber-500 rounded-full animate-wave origin-bottom"
                        style={{
                          height: `${Math.random() * 60 + 40}%`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: `${0.6 + Math.random() * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Translating transcript...</p>
                    <p className="text-xs text-muted-foreground">{translateProgress}</p>
                  </div>
                </div>
              )}

              {/* Translation Error State */}
              {translateState === "error" && translateError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mt-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Translation failed
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                        {translateError}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={handleTranslate} className="gap-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {transcript.translatedText && (
                <div className="pt-2">
                  <Badge variant="secondary" className="mb-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <Check className="mr-1 h-3 w-3" /> Translation Available
                  </Badge>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    This transcript has been translated to <strong>{SUPPORTED_LANGUAGES[transcript.targetLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name || transcript.targetLanguage}</strong>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

