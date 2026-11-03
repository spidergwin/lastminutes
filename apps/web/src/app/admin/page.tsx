"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminStats } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Users, FileText, Clock, CreditCard, ShieldAlert, DollarSign } from "lucide-react";
import { gateway } from "@/lib/api-client";

export default function AdminDashboard() {
  const { data: stats, isLoading, isError, error } = useQuery<AdminStats & { planBreakdown?: any[] }>({
    queryKey: ["admin-stats"],
    queryFn: () => gateway.get<any>("/v1/admin/stats"),
  });

  // Calculate revenue
  const planBreakdown = stats?.planBreakdown || [];
  const proCount = planBreakdown.find((p: any) => p.plan?.toLowerCase() === "pro")?._count?.plan || 0;
  const businessCount = planBreakdown.find((p: any) => p.plan?.toLowerCase() === "business")?._count?.plan || 0;
  
  const proRevenue = proCount * 15000;
  const businessRevenue = businessCount * 45000;
  const totalRevenue = proRevenue + businessRevenue;

  const statConfig = [
    { label: "Total Users", value: stats?.totalUsers || 0, subValue: `+${stats?.newUsersToday || 0} today`, icon: Users, color: "text-amber-600 dark:text-amber-400" },
    { label: "Active Subs", value: stats?.activeSubscriptions || 0, subValue: "Paid & Trial", icon: CreditCard, color: "text-orange-500" },
    { label: "Total Revenue", value: `₦${totalRevenue.toLocaleString()}`, subValue: "Monthly Recurring", icon: DollarSign, color: "text-emerald-500" },
    { label: "Total Transcripts", value: stats?.totalTranscripts || 0, subValue: "System-wide", icon: FileText, color: "text-amber-500" },
    {
      label: "Total Audio",
      value: (() => {
        const totalSeconds = stats?.totalDurationSeconds || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.round((totalSeconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      })(),
      subValue: "Processed audio",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading system statistics...</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="shadow-xs animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded mb-2"></div><div className="h-3 w-32 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] text-red-600 dark:text-red-400">
          Access Denied or Error
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm mt-2">
          {error instanceof Error ? error.message : "You do not have permission to view admin statistics or an error occurred."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">System-wide statistics and usage trends.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statConfig.map((stat) => (
          <Card key={stat.label} className="shadow-xs border-amber-500/10 hover:border-amber-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={`p-2 rounded-lg bg-amber-500/10 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="shadow-xs border-amber-500/10 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Pro Plan Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">₦{proRevenue.toLocaleString()}</div>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">/month</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">{proCount}</div>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-orange-500/10 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Business Plan Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">₦{businessRevenue.toLocaleString()}</div>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">/month</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">{businessCount}</div>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader>
            <CardTitle>Usage Trend</CardTitle>
            <CardDescription>Number of transcripts created over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pl-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.usageTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--card-foreground))"
                  }} 
                />
                <Bar dataKey="transcripts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Top Languages</CardTitle>
            <CardDescription>Most active languages this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.topLanguages || []).map((lang) => (
                <div key={lang.code} className="flex items-center">
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-muted-foreground">{lang.count} transcripts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500" 
                        style={{ width: `${Math.min(100, (lang.count / (stats?.totalTranscripts || 1)) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.topLanguages || stats.topLanguages.length === 0) && (
                <div className="text-center py-10 text-muted-foreground italic">
                  No language data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system audit logs and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.recentAuditLogs || []).map((log: any) => (
                <div key={log.id} className="flex items-center gap-4 text-sm border-b pb-2 last:border-0">
                  <div className="p-2 rounded-full bg-muted">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground text-xs">{log.user?.name || log.user?.email} on {log.resource}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {(!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0) && (
                <div className="text-center py-6 text-muted-foreground italic">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
