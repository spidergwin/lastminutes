"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Loader2, Sparkles, Bot, User,
  ExternalLink, Menu, Plus, MessageSquare, Paperclip, Mic, Search, Zap, HelpCircle, Gift, Settings
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranscripts } from "@/hooks";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { gateway, getAuthToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { Thread } from "@/components/assistant-ui/thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
function ChatArea({ 
  transcriptId, 
  threadId, 
  initialMessages 
}: { 
  transcriptId: string | null; 
  threadId: string | null; 
  initialMessages: any[]; 
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: gateway.url("/v1/chat"),
      headers: async () => {
        const token = await getAuthToken();
        return {
          Authorization: `Bearer ${token}`,
        };
      },
      body: {
        ...(transcriptId ? { transcriptId } : {}),
        ...(threadId ? { threadId } : {}),
      },
    }),
    messages: initialMessages,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

function ChatInterface() {
  const searchParams = useSearchParams();
  const transcriptId = searchParams.get("transcriptId");
  const threadId = searchParams.get("threadId");
  const router = useRouter();
  const { data: session } = useSession();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>("New Chat");
  const [text, setText] = useState<string>("");

  const { data: transcripts = [], isLoading: isLoadingTranscripts } = useTranscripts();
  
  const { data: transcript, isLoading: isLoadingTranscript } = useQuery({
    queryKey: ["transcript", transcriptId],
    queryFn: async () => {
      if (!transcriptId) return null;
      const { data } = await gateway.get<{ data: any }>(`/v1/transcripts/${transcriptId}`);
      return data;
    },
    enabled: !!transcriptId,
  });

  // Generate unique threadId for new general chats and redirect to it
  useEffect(() => {
    if (!threadId && !transcriptId) {
      const newThreadId = "gen-" + Math.random().toString(36).substring(2, 15);
      router.replace(`/chat?threadId=${newThreadId}`);
    }
  }, [threadId, transcriptId, router]);

  const { data: initialMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["chat-history", transcriptId, threadId],
    queryFn: async () => {
      let path = "/v1/chat/history";
      if (threadId) {
        path += `?threadId=${threadId}`;
      } else if (transcriptId) {
        path += `?transcriptId=${transcriptId}`;
      } else {
        path += "?transcriptId=new";
      }
      try {
        const data = await gateway.get<{ messages: any[] }>(path);
        return data.messages || [];
      } catch (err) {
        return [];
      }
    },
  });

  const { data: threadsData } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => {
      try {
        return await gateway.get<{ threads: any[] }>("/v1/chat/threads");
      } catch (err) {
        return { threads: [] };
      }
    },
    refetchInterval: 5000,
  });
  const threads = threadsData?.threads || [];

  // ChatArea below dynamically manages the chat runtime instance with database-fetched initialMessages

  useEffect(() => {
    if (threadId) {
      const currentThread = threads.find((t: any) => t.id === threadId);
      if (currentThread) {
        setCustomTitle(currentThread.title);
      } else {
        setCustomTitle("General Chat");
      }
    } else if (transcriptId) {
      if (transcript) {
        setCustomTitle(`Chat: ${transcript.title}`);
      } else {
        setCustomTitle("Meeting Chat");
      }
    } else {
      setCustomTitle("New Chat");
    }
  }, [threadId, transcriptId, threads, transcript]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full w-full bg-card/30 min-w-0 overflow-hidden">
      <div className="p-5 border-b border-border/40 flex flex-col gap-4 shrink-0 bg-background/50 backdrop-blur-sm">
        <Button 
          className="w-full justify-start h-10 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 rounded-xl shadow-sm shadow-amber-500/20"
          onClick={() => {
            router.push("/chat");
            setSheetOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New AI Chat</span>
          </div>
        </Button>
      </div>
      
      <ScrollArea className="flex-1 w-full min-w-0">
        <div className="p-4 flex flex-col gap-6 w-full min-w-0 overflow-hidden">
          {transcriptId && transcript && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Current Context
              </h3>
              <div className="rounded-xl border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10 p-3 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-600 dark:text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium line-clamp-2">{transcript.title}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      Linked Transcript
                    </span>
                  </div>
                </div>
                <Link href={`/transcripts/${transcriptId}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full gap-2 rounded-lg h-8 text-xs bg-background/50 hover:bg-background border-amber-200/50 dark:border-amber-800/30">
                    <ExternalLink className="h-3.5 w-3.5" /> View Full Transcript
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* General Chats */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Recent Chats
            </h3>
            {threads.filter((t: any) => !t.transcriptId).length === 0 ? (
              <p className="text-xs text-muted-foreground/60 px-1 py-1 italic">
                No recent general chats.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 w-full min-w-0">
                {threads
                  .filter((t: any) => !t.transcriptId)
                  .map((t: any) => (
                    <Button
                      key={t.id}
                      variant="ghost"
                      className={cn(
                        "w-full min-w-0 justify-start h-auto py-2 px-3 rounded-xl text-left transition-all overflow-hidden",
                        threadId === t.id 
                          ? 'bg-accent/80 hover:bg-accent shadow-sm ring-1 ring-border/50' 
                          : 'hover:bg-accent/50'
                      )}
                      onClick={() => {
                        router.push(`/chat?threadId=${t.id}`);
                        setSheetOpen(false);
                      }}
                    >
                      <div className="flex flex-col min-w-0 w-full pr-4">
                        <span className={cn(
                          "truncate text-sm font-medium block w-full",
                          threadId === t.id ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {t.title}
                        </span>
                      </div>
                    </Button>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Your Transcripts
            </h3>
            {isLoadingTranscripts ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
              </div>
            ) : transcripts.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-sm text-muted-foreground">No transcripts found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 w-full min-w-0">
                {transcripts.map((t: any) => (
                  <Button
                    key={t.id}
                    variant="ghost"
                    className={cn(
                      "w-full min-w-0 justify-start h-auto py-2.5 px-3 rounded-xl text-left transition-all overflow-hidden",
                      transcriptId === t.id 
                        ? 'bg-accent/80 hover:bg-accent shadow-sm ring-1 ring-border/50' 
                        : 'hover:bg-accent/50'
                    )}
                    onClick={() => {
                      router.push(`/chat?transcriptId=${t.id}`);
                      setSheetOpen(false);
                    }}
                  >
                    <div className="flex flex-col min-w-0 w-full gap-0.5 pr-4">
                      <span className={cn(
                        "truncate text-sm font-medium block w-full",
                        transcriptId === t.id ? "text-foreground" : "text-muted-foreground"
                      )}>{t.title}</span>
                      <span className="truncate text-[11px] text-muted-foreground/70 block w-full">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      
      {/* Custom Top Header mapping exactly to design */}
      <header className="flex-none h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
        <div className="flex items-center gap-3">
          {/* Main App Sidebar Trigger (Left) */}
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold truncate max-w-[180px] sm:max-w-[200px] md:max-w-[400px] font-[family-name:var(--font-display)]">
              {transcriptId 
                ? (isLoadingTranscript ? "Loading..." : transcript?.title || "Meeting Chat")
                : customTitle}
            </h1>
            {transcriptId && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                <span className="relative flex h-2 w-2">
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isLoadingTranscript ? 'bg-amber-600 animate-pulse' : 'bg-amber-600'}`}></span>
                </span>
                Context Linked
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {/* Projects/Transcripts Sheet Trigger (Right) */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-full shrink-0">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 flex flex-col">
              <SheetTitle className="sr-only">Chat History</SheetTitle>
              <div className="flex flex-col flex-1 overflow-hidden pt-10">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Main Chat Area */}
        <div className="flex flex-col flex-1 min-w-0 bg-background h-full">
          {isLoadingMessages ? (
            <div className="flex flex-1 items-center justify-center bg-background">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <ChatArea 
              key={threadId || transcriptId || "new"} 
              transcriptId={transcriptId} 
              threadId={threadId}
              initialMessages={initialMessages} 
            />
          )}
        </div>

        {/* Desktop Sidebar for Transcripts (Right side) */}
        <div className="hidden md:flex w-72 border-l bg-card/10 flex-col shrink-0 h-full min-w-0 overflow-hidden">
          <SidebarContent />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-[100dvh] w-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <ChatInterface />
    </Suspense>
  );
}

function MoreHorizontal(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
