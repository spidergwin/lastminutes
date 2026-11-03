"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Globe, Loader2, Calendar, ArrowRight, Link2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/features/translation/utils";
import { gateway } from "@/lib/api-client";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingTour, setIsResettingTour] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await authClient.updateUser({
        name: name,
      });
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = () => {
    toast.info("Password change functionality is coming soon.");
  };

  const handleResetTour = async () => {
    setIsResettingTour(true);
    try {
      await gateway.post("/v1/user/preferences", { tourCompleted: false });
      toast.success("Tour has been reset. Refreshing page...");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Failed to reset the onboarding tour");
      setIsResettingTour(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="space-y-1 fade-up">
        <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile */}
      <div className="fade-up-1">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <div className="fade-up-2">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>Preferences</CardTitle>
            </div>
            <CardDescription>Configure your default settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultLang">Default Transcription Language</Label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, { name, nativeName }]) => (
                    <SelectItem key={code} value={code}>
                      {name} <span className="text-muted-foreground text-xs">({nativeName})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Onboarding Tour</p>
                  <p className="text-xs text-muted-foreground">
                    Reset the guided tour to see it again on your dashboard.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetTour}
                  disabled={isResettingTour}
                >
                  {isResettingTour && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Tour
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <div className="fade-up-3">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your account security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">
                  Change your account password.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handlePasswordChange}>
                Change Password
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Account Status</p>
                <p className="text-xs text-muted-foreground">
                  Your account is active and in good standing.
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations */}
      <div className="fade-up-4">
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>Integrations</CardTitle>
            </div>
            <CardDescription>Connect external services to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/settings/integrations"
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card hover:bg-muted/20 p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Google Workspace & Meeting Bot
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sync calendar events and configure auto-join recording.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link
              href="/settings/integrations"
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card hover:bg-muted/20 p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Custom Storage
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bring your own storage (UploadThing) for large files.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
