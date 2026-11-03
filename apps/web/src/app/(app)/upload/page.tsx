"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateTranscript } from "@/hooks";
import { useFileUpload } from "@/hooks/useFileUpload";
import { SUPPORTED_LANGUAGES } from "@/features/translation/utils";
import { toast } from "sonner";
import { autoFormatTranscript, isMeetingTranscript, normalizeSpeakerLabel } from "@/lib/format-transcript";
import { gateway } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileAudio,
  FileVideo,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Waves,
  FileText,
  ArrowRight,
  Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const SUPPORTED_FORMATS = [
  { label: "MP3", type: "audio" },
  { label: "WAV", type: "audio" },
  { label: "M4A", type: "audio" },
  { label: "OGG", type: "audio" },
  { label: "FLAC", type: "audio" },
  { label: "WebM", type: "audio" },
  { label: "MP4", type: "video" },
  { label: "WebM", type: "video" },
  { label: "MOV", type: "video" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const createTranscriptMutation = useCreateTranscript();
  const {
    state,
    progress,
    error,
    result,
    selectedFile,
    selectFile,
    upload,
    reset,
  } = useFileUpload();

  const [language, setLanguage] = useState<string>("auto");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL transcription state
  const [audioUrl, setAudioUrl] = useState("");
  const [urlState, setUrlState] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlResult, setUrlResult] = useState<any>(null);
  const urlPollRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      selectFile(files[0]);
    }
  }, [selectFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectFile(files[0]);
    }
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }, [selectFile]);

  const handleUpload = useCallback(async () => {
    await upload(language === "auto" ? undefined : language);
  }, [upload, language]);

  const handleSaveAndView = useCallback(async () => {
    if (!result) return;

    // Format text intelligently based on whether speakers were detected
    const hasSpeakers = isMeetingTranscript(result.speakers);
    const normalizedSpeakers = result.speakers?.map(s => normalizeSpeakerLabel(s)) ?? [];
    const formattedText = hasSpeakers && result.segments
      ? autoFormatTranscript(result.segments, normalizedSpeakers)
      : result.text;

    try {
      const res = await createTranscriptMutation.mutateAsync({
        title: selectedFile
          ? `Upload — ${selectedFile.name.replace(/\.[^/.]+$/, "")}`
          : `Upload — ${new Date().toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        originalText: formattedText,
        sourceLanguage: result.language_code || "en",
        fileType: selectedFile?.type?.startsWith("video") ? "video" : "audio",
        segments: result.segments ?? undefined,
        speakers: normalizedSpeakers.length > 0 ? normalizedSpeakers : undefined,
        duration: result.duration ?? result.audio_duration ?? undefined,
      });

      const transcriptId = res?.data?.id;
      toast.success("Transcript saved!");
      if (transcriptId) {
        router.push(`/transcripts/${transcriptId}`);
      } else {
        router.push("/transcripts");
      }
    } catch {
      toast.error("Failed to save transcript");
    }
  }, [result, selectedFile, createTranscriptMutation, router]);

  // URL transcription handler
  const handleUrlSubmit = useCallback(async () => {
    if (!audioUrl.trim()) return;

    try {
      new URL(audioUrl);
    } catch {
      setUrlError("Please enter a valid URL.");
      return;
    }

    setUrlState("processing");
    setUrlError(null);
    setUrlResult(null);

    try {
      const data = await gateway.post<any>("/v1/transcription/upload", {
        audio_url: audioUrl,
        language: language === "auto" ? undefined : language,
      });

      if (!data.success) {
        throw new Error(data.error || "Failed to submit URL");
      }

      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const pollData = await gateway.get<any>(`/v1/transcription/upload/${data.jobId}`);

          if (pollData.data?.completed) {
            clearInterval(pollInterval);
            setUrlResult(pollData.data);
            setUrlState("completed");
          } else if (pollData.data?.status === "error") {
            clearInterval(pollInterval);
            setUrlError("Transcription failed. Please try a different URL.");
            setUrlState("error");
          }
        } catch {
          clearInterval(pollInterval);
          setUrlError("Lost connection while processing.");
          setUrlState("error");
        }
      }, 3000);

      urlPollRef.current = pollInterval;
    } catch (err: any) {
      setUrlError(err.message || "Something went wrong");
      setUrlState("error");
    }
  }, [audioUrl, language]);

  const handleUrlSaveAndView = useCallback(async () => {
    if (!urlResult) return;

    // Format text intelligently based on whether speakers were detected
    const hasSpeakers = isMeetingTranscript(urlResult.speakers);
    const normalizedSpeakers = urlResult.speakers?.map((s: string) => normalizeSpeakerLabel(s)) ?? [];
    const formattedText = hasSpeakers && urlResult.segments
      ? autoFormatTranscript(urlResult.segments, normalizedSpeakers)
      : urlResult.text;

    try {
      const res = await createTranscriptMutation.mutateAsync({
        title: `URL — ${new URL(audioUrl).hostname} — ${new Date().toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        originalText: formattedText,
        sourceLanguage: urlResult.language || "en",
        fileType: "url",
        segments: urlResult.segments ?? undefined,
        speakers: normalizedSpeakers.length > 0 ? normalizedSpeakers : undefined,
        duration: urlResult.duration ?? undefined,
      });

      const transcriptId = res?.data?.id;
      toast.success("Transcript saved!");
      if (transcriptId) {
        router.push(`/transcripts/${transcriptId}`);
      } else {
        router.push("/transcripts");
      }
    } catch {
      toast.error("Failed to save transcript");
    }
  }, [urlResult, audioUrl, createTranscriptMutation, router]);

  const resetUrl = useCallback(() => {
    if (urlPollRef.current) clearInterval(urlPollRef.current);
    setAudioUrl("");
    setUrlState("idle");
    setUrlError(null);
    setUrlResult(null);
  }, []);

  const isUploading = state === "uploading";
  const isProcessing = state === "processing";
  const isCompleted = state === "completed";
  const isError = state === "error";
  const hasFile = !!selectedFile && !isError;
  const canUpload = hasFile && state === "idle";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1 fade-up">
        <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Upload & Transcribe
        </h2>
        <p className="text-muted-foreground">
          Upload a file or paste a link to automatically transcribe audio and video with AI.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="fade-up-1">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">Upload File</CardTitle>
            </div>
            <CardDescription>
              Supported formats: MP3, WAV, M4A, OGG, FLAC, MP4, WebM, MOV · Max 2GB
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Drop Zone */}
              {!hasFile && !isUploading && !isProcessing && !isCompleted ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
                      isDragOver
                        ? "border-amber-500 bg-amber-500/5 scale-[1.01]"
                        : isError
                          ? "border-red-300 dark:border-red-800 bg-red-500/5 hover:border-red-400"
                          : "border-border/60 hover:border-amber-500/50 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Icon */}
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${
                      isError
                        ? "bg-red-500/10"
                        : "bg-gradient-to-br from-amber-500/10 to-orange-500/10"
                    }`}>
                      {isError ? (
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      ) : (
                        <Upload className="w-8 h-8 text-amber-500" />
                      )}
                    </div>

                    {isError ? (
                      <>
                        <p className="text-red-600 dark:text-red-400 font-medium mb-1">
                          {error}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click or drag to try a different file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-foreground font-medium mb-1">
                          {isDragOver ? "Drop your file here" : "Drag & drop your file here"}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          or click to browse your files
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {SUPPORTED_FORMATS.map(({ label, type }, i) => (
                            <Badge
                              key={`${label}-${type}-${i}`}
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 font-normal gap-1"
                            >
                              {type === "audio" ? (
                                <FileAudio className="h-2.5 w-2.5" />
                              ) : (
                                <FileVideo className="h-2.5 w-2.5" />
                              )}
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
              ) : null}

            {/* Selected File Info */}
              {hasFile && !isCompleted && (
                <div
                  className="rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center shrink-0">
                      {selectedFile?.type?.startsWith("video") ? (
                        <FileVideo className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <FileAudio className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile?.size || 0)}
                      </p>
                    </div>
                    {!isUploading && !isProcessing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={reset}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}

                  {/* Processing Status */}
                  {isProcessing && (
                    <div className="mt-3 flex items-center gap-2.5">
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
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Transcribing with AI... This may take a moment.
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Completed Result */}
              {isCompleted && result && (
                <div className="space-y-4">
                  {/* Success Header */}
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Transcription complete!
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                        {result.text.split(/\s+/).filter(Boolean).length} words transcribed
                        {result.audio_duration || result.duration ? ` from ${Math.round(result.audio_duration || result.duration || 0)}s of audio` : ""}
                        {isMeetingTranscript(result.speakers) && ` · ${result.speakers!.length} speakers detected`}
                      </p>
                    </div>
                  </div>

                  {/* Transcript Preview */}
                  <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">Preview</span>
                      </div>
                      {result.language_code && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {result.language_code.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 max-h-48 overflow-y-auto scrollbar-thin">
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {result.text.length > 800 ? result.text.slice(0, 800) + "..." : result.text}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveAndView}
                      disabled={createTranscriptMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 gap-2"
                    >
                      {createTranscriptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      Save & View Transcript
                    </Button>
                    <Button variant="outline" onClick={reset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Upload Another
                    </Button>
                  </div>
                </div>
              )}

            {/* Error state with retry */}
              {isError && selectedFile && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Upload failed
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                        {error}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => handleUpload()} className="gap-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </Button>
                        <Button size="sm" variant="ghost" onClick={reset} className="text-xs">
                          Choose Different File
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Language Selection & Upload Button */}
            {canUpload && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Language:</span>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, nativeName }]) => (
                        <SelectItem key={code} value={code} className="text-sm">
                          {name} <span className="text-muted-foreground text-xs">({nativeName})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleUpload}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 border-0 gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Start Transcription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* URL Transcription Card */}
      <div className="fade-up-2">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">Transcribe from URL</CardTitle>
            </div>
            <CardDescription>
              Paste a direct link to an audio or video file (MP3, WAV, MP4, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {urlState === "idle" || urlState === "error" ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://example.com/audio.mp3"
                    value={audioUrl}
                    onChange={(e) => { setAudioUrl(e.target.value); setUrlError(null); }}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  />
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={!audioUrl.trim()}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 gap-1.5 shrink-0"
                  >
                    <Waves className="h-4 w-4" />
                    Transcribe
                  </Button>
                </div>
                {urlError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {urlError}
                  </div>
                )}
              </>
            ) : urlState === "processing" ? (
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
                  <p className="text-sm font-medium">Transcribing from URL...</p>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{audioUrl}</p>
                </div>
              </div>
            ) : urlState === "completed" && urlResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Transcription complete!</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                      {urlResult.text.split(/\s+/).filter(Boolean).length} words transcribed
                      {urlResult.duration ? ` from ${Math.round(urlResult.duration)}s of audio` : ""}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Preview</span>
                    </div>
                  </div>
                  <div className="p-4 max-h-48 overflow-y-auto scrollbar-thin">
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {urlResult.text.length > 800 ? urlResult.text.slice(0, 800) + "..." : urlResult.text}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleUrlSaveAndView}
                    disabled={createTranscriptMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 gap-2"
                  >
                    {createTranscriptMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Save & View Transcript
                  </Button>
                  <Button variant="outline" onClick={resetUrl} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Try Another URL
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="fade-up-3">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Waves className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold">Tips for better results</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                Use clear audio with minimal background noise
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                Ensure speakers are close to the microphone
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                For URL transcription, use direct links to audio/video files (not streaming pages)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                Select the correct language for non-English content
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
