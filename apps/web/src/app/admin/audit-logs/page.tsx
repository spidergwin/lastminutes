"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ShieldAlert, Search, Loader2, Calendar, User as UserIcon, Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { gateway } from "@/lib/api-client";

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", search, page],
    queryFn: () => gateway.get<any>(`/v1/admin/audit-logs?search=${encodeURIComponent(search)}&page=${page}&limit=10`),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">System activity and user actions.</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search actions or users..."
              className="pl-9 h-10 bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            {data?.meta?.total || 0} Total Events
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Time</TableHead>
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
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate max-w-[150px] uppercase text-xs tracking-wider">
                            {log.action}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.user ? (
                          <>
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={log.user.image || ""} />
                              <AvatarFallback className="text-[10px]">
                                <UserIcon className="w-3 h-3" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm">{log.user.name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{log.user.email}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">System</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="text-xs text-muted-foreground font-mono">{log.resourceId.slice(0, 8)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px] truncate text-xs text-muted-foreground">
                        {log.metadata ? JSON.stringify(log.metadata) : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      <div className="flex flex-col items-end gap-1">
                        <span>{format(new Date(log.createdAt), "MMM d, yyyy")}</span>
                        <span className="text-xs">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                      </div>
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
