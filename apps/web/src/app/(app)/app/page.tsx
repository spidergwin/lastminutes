"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useStreamingTranscription } from "@/hooks/useStreamingTranscription";
import { useDictationStore } from "@/store/dictation";
import { useTranslate, useCreateTranscript, useTranscripts, useUsage } from "@/hooks";
import { autoFormatTranscript, normalizeSpeakerLabel, isMeetingTranscript, getSpeakerColor } from "@/lib/format-transcript";
import { gateway } from "@/lib/api-client";
import {
  Mic,
  StopCircle,
  Copy,
  Download,
  RotateCcw,
  Languages,
  Trash2,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Wand2,
  ChevronDown,
  Clock,
  Waves,
  X,
  Plus,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/features/translation/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DictationWorkspace() {
  const {
    transcript,
    interimTranscript,
    isListening,
    isProcessing,
    language,
    setLanguage,
    targetLanguage,
    setTargetLanguage,
    reset,
    setTranscript,
    error,
    setError
  } = useDictationStore();

  const { startStreaming, stopStreaming, getTranscriptData, isSupported, error: streamingError, isConnecting, segments: liveSegments, currentSpeaker, audioBlob } = useStreamingTranscription();
  const translateMutation = useTranslate();
  const createTranscriptMutation = useCreateTranscript();
  const { data: recentTranscripts, isLoading: isLoadingTranscripts } = useTranscripts();
  const { data: usageData } = useUsage();
  const [translatedText, setTranslatedText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Mount status for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current && (transcript || interimTranscript)) {
      transcriptEndRef.current.scrollIntoView({ 
        behavior: isListening ? "auto" : "smooth",
        block: "end"
      });
    }
  }, [transcript, interimTranscript, isListening]);

  // Timer for recording duration
  useEffect(() => {
    if (isListening) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isListening, startStreaming, stopStreaming]);

  // Keyboard shortcut: Cmd/Ctrl + Space to toggle mic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        e.preventDefault();
        handleToggleMic();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleMic]);

  const requestPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setError(null);
      toast.success("Microphone permission granted");
    } catch {
      setError("Microphone permission denied. Please enable it in your browser settings.");
      toast.error("Microphone permission denied");
    }
  }, [setError]);

  const handleTranslate = useCallback(async () => {
    if (!transcript || !targetLanguage) {
      toast.error("Enter text and select target language");
      return;
    }
    translateMutation.mutate(
      { text: transcript, sourceLang: "en", targetLang: targetLanguage },
      {
        onSuccess: (data: any) => {
          setTranslatedText(data.data.translatedText);
          setShowTranslation(true);
          toast.success("Translation complete");
        },
      }
    );
  }, [transcript, targetLanguage, translateMutation]);

  const handleSave = useCallback(async () => {
    if (!transcript) {
      toast.error("Nothing to save");
      return;
    }
    try {
      // Get structured data from the streaming session
      const transcriptData = getTranscriptData();
      const speakers = transcriptData.speakers.map(s => normalizeSpeakerLabel(String(s ?? 0)));
      const hasSpeakers = speakers.length > 0;

      // Format segments into meeting conversation if multiple speakers detected
      const formattedSegments = transcriptData.segments.map(seg => ({
        speaker: normalizeSpeakerLabel(String(seg.speaker ?? 0)),
        text: seg.text,
        start: Math.round(seg.start * 1000), // Convert to ms
        end: Math.round(seg.end * 1000),
        confidence: seg.words?.[0]?.confidence,
        words: seg.words?.map(w => ({
          text: w.punctuated_word || w.word,
          start: Math.round(w.start * 1000),
          end: Math.round(w.end * 1000),
          confidence: w.confidence,
          speaker: normalizeSpeakerLabel(String(w.speaker ?? 0)),
        })),
      }));

      const originalText = hasSpeakers && formattedSegments.length > 0
        ? autoFormatTranscript(formattedSegments, speakers)
        : transcript;

      // Upload audio if available
      let fileUrl: string | undefined;
      if (audioBlob) {
        toast.loading("Uploading audio...", { id: "upload-toast" });
        try {
          const file = new File([audioBlob], `dictation-${Date.now()}.webm`, { type: audioBlob.type });
          const initiateData = await gateway.post<any>("/v1/upload/initiate", {
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          });
          if (initiateData.success) {
            const { uploadUrl, type, publicUrl: initialPublicUrl } = initiateData;
            fileUrl = initialPublicUrl;

            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (type === "drive") {
              const putResponseText = await putRes.text();
              const driveFile = JSON.parse(putResponseText);
              const fileId = driveFile.id;

              const publicData = await gateway.post<any>("/v1/upload/public", { fileId });
              if (publicData.success) {
                fileUrl = publicData.publicUrl;
              }
            }
          }
          toast.dismiss("upload-toast");
        } catch (e) {
          console.error("Audio upload failed", e);
          toast.dismiss("upload-toast");
          toast.error("Audio upload failed, saving text only.");
        }
      }

      await createTranscriptMutation.mutateAsync({
        title: `Dictation — ${new Date().toLocaleDateString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        originalText,
        translatedText: translatedText || undefined,
        targetLanguage: translatedText && targetLanguage ? targetLanguage : undefined,
        sourceLanguage: "en",
        fileType: "dictation",
        fileUrl,
        segments: formattedSegments.length > 0 ? formattedSegments : undefined,
        speakers: hasSpeakers ? speakers : undefined,
        duration: transcriptData.duration || undefined,
      });
      toast.success("Transcript saved to your library");
      reset();
      setTranslatedText("");
    } catch {
      toast.error("Failed to save transcript");
    }
  }, [transcript, createTranscriptMutation, getTranscriptData, audioBlob, reset]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const handleDownload = useCallback((text: string, filename: string) => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `${filename}-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Downloaded successfully");
  }, []);

  if (!mounted) {
    return null; // Prevent hydration error by not rendering anything until mounted
  }

  if (!isSupported) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5 shadow-xl">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-destructive text-xl font-bold font-[family-name:var(--font-display)]">Browser Not Supported</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Your browser doesn&apos;t support the Web Speech API. Please try Chrome, Edge, or Safari.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planName = usageData?.subscription?.plan
    ? usageData.subscription.plan.charAt(0) + usageData.subscription.plan.slice(1).toLowerCase()
    : "Trial";

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* Custom Top Header mapping exactly to design */}
      <header className="flex-none h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          {/* Main App Sidebar Trigger (Left) */}
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold truncate font-[family-name:var(--font-display)]">
            Dictation Workspace
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-xs font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {planName} Plan
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full p-4 lg:p-6 overflow-hidden">
          {/* Error Banner */}
          <AnimatePresence>
            {(error || streamingError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-1 pb-3"
              >
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">{error || streamingError}</span>
                    <Button size="sm" variant="outline" onClick={requestPermission} className="ml-4 h-7 text-xs bg-destructive/10 border-destructive/20 hover:bg-destructive/20">
                      Grant Permission
                    </Button>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 pb-0 min-h-0 overflow-hidden mb-4">
            {/* Transcript Panel */}
            <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden h-full">
              {/* Transcript Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border/40 bg-muted/20 gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Transcript</span>
                  </div>

                  <div className="h-4 w-px bg-border/60 hidden sm:block" />

                  {/* Spoken Language Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">Dictation Language:</span>
                    <Select
                      value={language || "en"}
                      onValueChange={(value) => setLanguage(value)}
                      disabled={isListening}
                    >
                      <SelectTrigger id="dictation-language-selector" className="h-8 w-[140px] sm:w-[160px] rounded-lg text-xs border-border/60 bg-background shadow-sm">
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72">
                        <SelectItem value="multi" className="text-xs py-1.5 font-medium text-amber-600 dark:text-amber-400">
                          Auto / Mixed Languages
                        </SelectItem>
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, nativeName }]) => (
                          <SelectItem key={code} value={code} className="text-xs py-1.5">
                            {name} <span className="text-muted-foreground text-[10px]">({nativeName})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isListening && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-red-500 border-red-500/30 bg-red-500/5 gap-1.5 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      REC {formatTime(elapsedTime)}
                    </Badge>
                  )}
                  {isConnecting && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Connecting
                    </Badge>
                  )}
                  {isProcessing && !isConnecting && !isListening && (
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5 gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(transcript)} disabled={!transcript}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Copy</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(transcript, "transcript")} disabled={!transcript}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Download</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setTranscript(""); setTranslatedText(""); }} disabled={!transcript}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">Clear</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Transcript Body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin relative bg-card">
                {transcript || interimTranscript ? (
                  <div className="p-5 text-[15px] leading-[1.8] text-foreground/90">
                    {/* Show speaker-labeled segments if available during live recording */}
                    {liveSegments.length > 0 && new Set(liveSegments.map(s => s.speaker).filter(s => s !== undefined)).size > 0 ? (
                      <div className="space-y-3">
                        {liveSegments.map((seg, i) => {
                          const label = normalizeSpeakerLabel(String(seg.speaker ?? 0));
                          const color = getSpeakerColor(String(seg.speaker ?? 0));
                          const prevSpeaker = i > 0 ? liveSegments[i - 1].speaker : null;
                          const isNewSpeaker = seg.speaker !== prevSpeaker;
                          return (
                            <div key={i}>
                              {isNewSpeaker && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex h-2 w-2 rounded-full ${color.dot}`} />
                                  <span className={`text-xs font-semibold ${color.text}`}>{label}</span>
                                </div>
                              )}
                              <p className="pl-4">{seg.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <>{transcript}</>
                    )}
                    <AnimatePresence>
                      {interimTranscript && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          className="text-amber-500 dark:text-amber-400"
                        >
                          {interimTranscript}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <div ref={transcriptEndRef} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    {/* Animated waveform idle indicator */}
                    <div className="flex items-end gap-[3px] h-10 mb-5 relative">
                      <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="w-[3px] bg-gradient-to-t from-amber-500/40 to-orange-500/20 rounded-full animate-wave origin-bottom relative z-10"
                          style={{
                            height: `${Math.sin(i * 0.5) * 60 + 30}%`,
                            animationDelay: `${i * 0.08}s`,
                            animationDuration: `${1.2 + Math.sin(i * 0.3) * 0.3}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground/70 text-sm font-medium">
                      Press the microphone to start recording
                    </p>
                    <p className="text-muted-foreground/40 text-xs mt-1.5">
                      or use <kbd className="inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">⌘</kbd> + <kbd className="inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">Space</kbd>
                    </p>
                  </div>
                )}
              </div>

              {/* Transcript Footer — Status + Word Count */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{wordCount} {wordCount === 1 ? "word" : "words"}</span>
                  {transcript && (
                    <>
                      <span className="text-border">·</span>
                      <span>English</span>
                    </>
                  )}
                  {liveSegments.length > 0 && (() => {
                    const uniqueSpeakers = new Set(liveSegments.map(s => s.speaker).filter(s => s !== undefined)).size;
                    return uniqueSpeakers > 0 ? (
                      <>
                        <span className="text-border">·</span>
                        <span>{uniqueSpeakers} speaker{uniqueSpeakers !== 1 ? 's' : ''}</span>
                      </>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {!isListening && transcript && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                      Ready to save
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Translation Panel */}
            <AnimatePresence>
              {showTranslation && translatedText && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col w-full lg:w-[380px] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden shrink-0 h-full"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-amber-500/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-semibold">Translation</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTranslation(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 text-[14px] leading-[1.8] text-foreground/90 scrollbar-thin bg-card">
                    {translatedText}
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/10 shrink-0">
                    <span className="text-xs text-muted-foreground capitalize">
                      {SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name || "Translation"}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleCopy(translatedText)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleDownload(translatedText, "translation")}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Control Bar */}
          <div className="shrink-0 py-3 sm:py-4 border-t border-border/40 bg-background/50 backdrop-blur-sm px-1 rounded-xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Translation Actions (Row 1 on mobile, Right on desktop) */}
              <div className="flex items-center gap-2 w-full lg:w-auto order-1 lg:order-2">
                <Select
                  value={targetLanguage || ""}
                  onValueChange={(value) => setTargetLanguage(value || null)}
                >
                  <SelectTrigger className="h-10 flex-1 lg:w-[140px] rounded-xl text-sm border-border/60 bg-background shadow-sm">
                    <SelectValue placeholder="Target Language" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-72">
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, nativeName }]) => (
                      <SelectItem key={code} value={code} className="text-sm py-2">
                        {name} <span className="text-muted-foreground text-xs">({nativeName})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  className="h-10 px-4 rounded-xl gap-2 text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/15 border-0 flex-1 lg:flex-none"
                  disabled={!transcript || !targetLanguage || translateMutation.isPending}
                  onClick={handleTranslate}
                >
                  {translateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  <span>Translate</span>
                </Button>
              </div>

              {/* Main Actions (Row 2 on mobile, Left on desktop) */}
              <div className="flex items-center justify-between lg:justify-start gap-4 w-full lg:w-auto order-2 lg:order-1 bg-muted/30 lg:bg-transparent p-2 lg:p-0 rounded-2xl border border-border/40 lg:border-0">
                {/* Reset button */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background"
                        onClick={() => { reset(); setTranslatedText(""); setShowTranslation(false); }}
                        disabled={!transcript && !isListening}
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Reset Workspace</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Mic button and timer */}
                <div className="flex items-center gap-3">
                  {isListening && (
                    <div className="flex flex-col items-center sm:flex-row sm:gap-2 text-xs sm:text-sm text-red-500 tabular-nums font-bold">
                      <Clock className="h-3.5 w-3.5 hidden sm:block" />
                      {formatTime(elapsedTime)}
                    </div>
                  )}
                  <button
                    onClick={handleToggleMic}
                    id="dictation-mic-button"
                    className={`relative group flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${isListening
                      ? "bg-red-500 hover:bg-red-600 shadow-red-500/30"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30"
                      } shadow-lg active:scale-95`}
                  >
                    {isListening ? (
                      <StopCircle className="h-6 w-6 text-white" />
                    ) : (
                      <Mic className="h-6 w-6 text-white" />
                    )}
                    {isListening && (
                      <span className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-ping opacity-20" />
                    )}
                  </button>
                </div>

                {/* Save button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 px-4 rounded-xl gap-2 text-sm font-medium border-border/60 hover:bg-background"
                  onClick={handleSave}
                  disabled={!transcript || createTranscriptMutation.isPending}
                >
                  {createTranscriptMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Recent Transcripts */}
        <div className="hidden lg:flex w-80 border-l bg-card/10 flex-col shrink-0 h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/10 shrink-0">
            <h3 className="font-semibold text-sm">Recent Transcripts</h3>
            <Link href="/transcripts">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 bg-card/5">
            {isLoadingTranscripts ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentTranscripts && recentTranscripts.length > 0 ? (
              <div className="space-y-2">
                {recentTranscripts.slice(0, 8).map((transcript: any) => (
                  <Link key={transcript.id} href={`/transcripts/${transcript.id}`}>
                    <div className="group flex flex-col min-w-0 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 bg-card/45 shadow-sm">
                      <p className="text-sm font-medium truncate group-hover:text-amber-600 transition-colors pr-4">
                        {transcript.title || "Untitled"}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(transcript.createdAt).toLocaleDateString()}
                        </p>
                        <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                          {transcript.fileType === "dictation" ? "Dictation" : "Upload"}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No recent transcripts</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border/40 bg-muted/5 shrink-0">
            <Link href="/upload">
              <Button variant="outline" className="w-full gap-2 justify-center border-dashed">
                <Plus className="h-4 w-4" />
                Upload Audio/Video
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
