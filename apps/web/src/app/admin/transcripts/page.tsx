"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, Search, Loader2, ArrowRight, Calendar, User as UserIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { gateway } from "@/lib/api-client";

export default function AdminTranscriptsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transcripts", search, page],
    queryFn: () => gateway.get<any>(`/v1/admin/transcripts?search=${encodeURIComponent(search)}&page=${page}&limit=10`),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] tracking-tight">Transcripts</h1>
          <p className="text-muted-foreground mt-1">View and manage all user meeting transcripts.</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts..."
              className="pl-9 h-10 bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            {data?.meta?.total || 0} Total Transcripts
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Transcript</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No transcripts found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((transcript: any) => (
                  <TableRow key={transcript.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                            {transcript.title || "Untitled Meeting"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {transcript.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={transcript.user?.image || ""} />
                          <AvatarFallback className="text-[10px]">
                            <UserIcon className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">{transcript.user?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{transcript.user?.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-background">
                        {Math.floor((transcript.duration || 0) / 60)}m {(transcript.duration || 0) % 60}s
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(transcript.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/transcripts/${transcript.id}`}>
                        <Button variant="ghost" size="sm" className="hover:text-amber-600 hover:bg-amber-500/10">
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-muted/10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {page} of {data.meta.totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
              disabled={page === data.meta.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
