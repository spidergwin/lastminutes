"use client";

import { useState, useMemo } from "react";
import { useTranscripts, useDeleteTranscript } from "@/hooks";
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
  Filter,
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
import { format } from "date-fns";

export default function TranscriptsPage() {
  const { data: transcripts = [], isLoading } = useTranscripts();
  const deleteMutation = useDeleteTranscript();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) return transcripts;
    const query = searchQuery.toLowerCase();
    return transcripts.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.originalText.toLowerCase().includes(query)
    );
  }, [transcripts, searchQuery]);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Transcripts
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse, search, and manage all your transcriptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/upload">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
          </Link>
          <Link href="/app">
            <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 gap-1.5">
              <Mic className="h-3.5 w-3.5" /> New Dictation
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="fade-up-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or content..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          {filteredTranscripts.length} result{filteredTranscripts.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Transcripts List */}
      <div className="fade-up-2">
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading transcripts...</p>
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
                    : "Start dictating or upload an audio file to create your first transcript."}
                </p>
                {!searchQuery && (
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/app">
                      <Button variant="outline" className="gap-2 hover:border-amber-500/30">
                        <Mic className="h-4 w-4" /> Start Dictation
                      </Button>
                    </Link>
                    <Link href="/upload">
                      <Button variant="outline" className="gap-2 hover:border-amber-500/30">
                        <Upload className="h-4 w-4" /> Upload File
                      </Button>
                    </Link>
                  </div>
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
                      <TableHead className="text-right pr-4 sm:pr-6 w-[25%] sm:w-[10%]">Actions</TableHead>
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
                            <Badge variant="secondary" className="bg-muted/50 font-normal text-xs">
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
                              <span className="truncate">{format(new Date(transcript.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4 sm:pr-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/transcripts/${transcript.id}`} className="flex items-center cursor-pointer">
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
