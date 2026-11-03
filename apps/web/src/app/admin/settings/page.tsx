import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Globe, Settings2, ShieldCheck } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure external services and system-wide feature toggles.</p>
      </div>

      <div className="grid gap-6">
        {/* API Configuration */}
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle>External Services</CardTitle>
            </div>
            <CardDescription>
              Configuration for translation and transcription engines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { name: "Deepgram API Key", env: "DEEPGRAM_API_KEY", placeholder: "Your Deepgram API key" },
              { name: "AssemblyAI API Key", env: "ASSEMBLYAI_API_KEY", placeholder: "Your AssemblyAI API key" },
              { name: "OpenAI API Key", env: "OPENAI_API_KEY", placeholder: "sk-..." },
              { name: "Recall.ai API Key", env: "RECALL_API_KEY", placeholder: "Your Recall.ai API key" },
            ].map((service) => (
              <div key={service.env} className="space-y-2">
                <Label htmlFor={service.env}>{service.name}</Label>
                <Input
                  id={service.env}
                  type="text"
                  placeholder={service.placeholder}
                  defaultValue={process.env[service.env] || ""}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-[12px] text-muted-foreground">
                  This value is currently managed via environment variables.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Settings2 className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle>Feature Toggles</CardTitle>
            </div>
            <CardDescription>
              Enable or disable core application features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {[
                { id: "dictation", label: "Enable Live Dictation", description: "Allow users to record and transcribe audio in real-time." },
                { id: "upload", label: "Enable File Upload", description: "Allow users to upload audio files for transcription." },
                { id: "translation", label: "Enable Translation", description: "Allow users to translate transcripts into other languages." },
              ].map((feature) => (
                <div key={feature.id} className="flex items-start gap-3 space-y-0">
                  <Checkbox id={feature.id} defaultChecked className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={feature.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {feature.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-xs border-red-500/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-600" />
              <CardTitle>Security & Access</CardTitle>
            </div>
            <CardDescription>
              Configure system-wide security and access controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Disable public access to the application for maintenance.
                </p>
              </div>
              <Checkbox />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to sign up for an account.
                </p>
              </div>
              <Checkbox defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancel</Button>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20">
            Save System Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
