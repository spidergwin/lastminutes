"use client";

import React, { useState } from "react";
import { Check, Copy, Download, FileText, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatSummaryToText } from "@/features/summarization/formatter";

interface SummaryRendererProps {
  content: any;
  type: string;
  className?: string;
  hideActions?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

import { StandaloneMarkdown } from "@/components/assistant-ui/markdown-text";

export function SummaryRenderer({ 
  content, 
  type, 
  className, 
  hideActions = false,
  onDelete,
  isDeleting = false
}: SummaryRendererProps) {
  const [copied, setCopied] = useState(false);

  // Use the shared formatter to get a consistent string representation
  const formattedText = formatSummaryToText(content, type);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    toast.success("Summary copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToTxt = () => {
    const blob = new Blob([formattedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type.toLowerCase().replace(/_/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Summary exported as TXT");
  };

  if (!formattedText) {
    return null;
  }

  return (
    <div className={cn("relative group", className)}>
      {!hideActions && (
        <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={exportToTxt}
            title="Export as TXT"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-muted-foreground hover:text-destructive"
               onClick={onDelete}
               disabled={isDeleting}
               title="Delete summary"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      )}
      <div className={cn("text-foreground", !hideActions && "pr-0")}>
        <StandaloneMarkdown content={formattedText} />
      </div>
    </div>
  );
}
