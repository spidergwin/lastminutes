"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useUsage } from "@/hooks";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transcripts": "Transcripts",
  "/app": "Dictation Workspace",
  "/upload": "Upload & Transcribe",
  "/meetings": "Meetings",
  "/settings": "Settings",
  "/settings/billing": "Billing",
  "/settings/integrations": "Integrations",
  "/chat": "AI Chat",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: usageData } = useUsage();

  // Match route titles, including dynamic routes
  let pageTitle = routeTitles[pathname] || "Workspace";
  if (pathname.startsWith("/transcripts/") && pathname !== "/transcripts") {
    pageTitle = "Transcript";
  } else if (pathname.startsWith("/dashboard/") && pathname !== "/dashboard") {
    pageTitle = "Transcript";
  }

  const planName = usageData?.subscription?.plan
    ? usageData.subscription.plan.charAt(0) + usageData.subscription.plan.slice(1).toLowerCase()
    : "Trial";

  // Check trial expiration
  const isTrial = usageData?.subscription?.plan === "TRIAL";
  const trialEndsAt = usageData?.subscription?.trialEndsAt ? new Date(usageData.subscription.trialEndsAt) : null;
  const isTrialExpired = isTrial && trialEndsAt && trialEndsAt < new Date();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {(pathname !== "/chat" && pathname !== "/app") && (
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border" />
              <h1 className="text-sm font-semibold text-foreground font-[family-name:var(--font-display)]">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                {planName} Plan
              </Badge>
              <ThemeToggle />
            </div>
          </header>
        )}
        <div className={`flex-1 overflow-x-hidden min-w-0 ${(pathname === "/chat" || pathname === "/app") ? "p-0 overflow-y-hidden" : "overflow-y-auto p-4 md:p-6 lg:p-8"}`}>
          {isTrialExpired && pathname !== "/settings/billing" ? (
            <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
              <div className="max-w-md text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold font-[family-name:var(--font-display)]">Your Trial Has Expired</h2>
                  <p className="text-muted-foreground">
                    Upgrade to Pro to continue accessing your dictation workspace, transcript history, and all premium features.
                  </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                  <a href="/settings/billing">
                    <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium shadow-md shadow-amber-500/20 border-0">
                      Upgrade to Pro
                    </Button>
                  </a>
                  <a href="/dashboard">
                    <Button variant="outline" size="lg" className="w-full">
                      Back to Dashboard
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>

    </SidebarProvider>
  );
}
