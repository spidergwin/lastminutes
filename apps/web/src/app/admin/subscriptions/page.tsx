"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, Search, Loader2, Calendar, User as UserIcon, CheckCircle2, XCircle
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

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subscriptions", search, page],
    queryFn: () => gateway.get<any>(`/v1/admin/subscriptions?search=${encodeURIComponent(search)}&page=${page}&limit=10`),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage user billing and subscription plans.</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or plan..."
              className="pl-9 h-10 bg-background"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-sm font-medium text-muted-foreground hidden sm:block">
            {data?.meta?.total || 0} Total Subscriptions
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Period</TableHead>
                <TableHead className="text-right">Created At</TableHead>
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
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((sub: any) => (
                  <TableRow key={sub.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sub.user ? (
                          <>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={sub.user.image || ""} />
                              <AvatarFallback className="text-xs">
                                <UserIcon className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{sub.user.name || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{sub.user.email}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Deleted User</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium uppercase text-xs tracking-wider">
                            {sub.planId}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {sub.planId?.toLowerCase() === "pro" 
                            ? "₦15,000/mo" 
                            : sub.planId?.toLowerCase() === "business" 
                            ? "₦45,000/mo" 
                            : "Free Trial"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          sub.status === "active" || sub.status === "trialing"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : sub.status === "canceled"
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        }
                      >
                        {sub.status === "active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {sub.status === "canceled" && <XCircle className="w-3 h-3 mr-1" />}
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground text-xs mb-0.5">Ends</span>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      <div className="flex items-center justify-end gap-1.5">
                        {format(new Date(sub.createdAt), "MMM d, yyyy")}
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
