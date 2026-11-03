"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoreHorizontal, Search, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { gateway } from "@/lib/api-client";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["admin-users", search, role, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role !== "ALL") params.set("role", role);
      params.set("page", page.toString());
      
      return gateway.get<any>(`/v1/admin/users?${params.toString()}`);
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to hard delete this user and all their data?")) return;
    try {
      await gateway.delete(`/v1/admin/users/${id}`);
      toast.success("User deleted");
      refetch();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await gateway.patch(`/v1/admin/users/${id}`, { role: newRole });
      toast.success("Role updated");
      refetch();
    } catch {
      toast.error("Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage all registered users on the platform.</p>
      </div>

      <Card className="shadow-xs border-amber-500/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9 bg-muted/50"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={role} onValueChange={(val) => { setRole(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/50">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-amber-500/5 text-amber-700 dark:text-amber-400 font-medium border-b border-amber-500/20">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Transcripts</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-red-500">
                      Failed to load users. You might not have permission.
                    </td>
                  </tr>
                ) : data?.users?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name || "No name"}</div>
                      <div className="text-muted-foreground text-xs">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold">
                        {user.subscription?.plan || "TRIAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user._count?.transcripts || 0}</td>
                    <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => handleDelete(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!isLoading && !isError && (!data?.users || data.users.length === 0)) && (
              <div className="p-8 text-center text-muted-foreground">No users found.</div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground border rounded-md">
                Loading users...
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-red-500 border rounded-md">
                Failed to load users. You might not have permission.
              </div>
            ) : data?.users?.map((user: any) => (
              <div key={user.id} className="p-4 border rounded-lg bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{user.name || "No name"}</div>
                    <div className="text-muted-foreground text-xs">{user.email}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mr-2 -mt-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-semibold">
                    {user.subscription?.plan || "TRIAL"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Transcripts</span>
                  <span className="font-medium">{user._count?.transcripts || 0}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {(!isLoading && !isError && (!data?.users || data.users.length === 0)) && (
              <div className="p-8 text-center text-muted-foreground border rounded-md">No users found.</div>
            )}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {data?.pagination?.page || 1} of {data?.pagination?.pages || 1}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= (data?.pagination?.pages || 1)} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
