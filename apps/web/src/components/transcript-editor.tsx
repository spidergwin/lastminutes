'use client';

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Plate, usePlateEditor } from 'platejs/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { BasicBlocksKit } from '@/components/editor/plugins/basic-blocks-kit';
import { BasicMarksKit } from '@/components/editor/plugins/basic-marks-kit';
import { ListKit } from '@/components/editor/plugins/list-kit';
import { LinkKit } from '@/components/editor/plugins/link-kit';
import { CodeBlockKit } from '@/components/editor/plugins/code-block-kit';
import { AutoformatKit } from '@/components/editor/plugins/autoformat-kit';
import { ExitBreakKit } from '@/components/editor/plugins/exit-break-kit';
import { FloatingToolbarKit } from '@/components/editor/plugins/floating-toolbar-kit';
import { SlashKit } from '@/components/editor/plugins/slash-kit';
import { BlockMenuKit } from '@/components/editor/plugins/block-menu-kit';
import { BlockPlaceholderKit } from '@/components/editor/plugins/block-placeholder-kit';
import { FixedToolbarKit } from '@/components/editor/plugins/fixed-toolbar-kit';
import { AIKit } from '@/components/editor/plugins/ai-kit';
import { CopilotKit } from '@/components/editor/plugins/copilot-kit';
import { TrailingBlockPlugin } from 'platejs';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

interface TranscriptEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

// Convert plain text to Plate value format
function textToSlateValue(text: string) {
  if (!text) {
    return [{ type: 'p', children: [{ text: '' }] }];
  }

  const paragraphs = text.split('\n\n');
  return paragraphs.map((para) => {
    if (!para.trim()) {
      return { type: 'p', children: [{ text: '' }] };
    }
    return {
      type: 'p',
      children: [{ text: para.replace(/\n/g, ' ') }],
    };
  });
}

// Convert Plate value back to plain text
function slateValueToText(value: any[]): string {
  if (!value || !Array.isArray(value)) return '';

  function extractText(node: any): string {
    if (typeof node.text === 'string') return node.text;
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join('');
    }
    return '';
  }

  return value.map((block) => extractText(block)).join('\n\n');
}

const TranscriptEditorPlugins = [
  ...CopilotKit,
  ...AIKit,
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...LinkKit,

  // Marks
  ...BasicMarksKit,

  // Block Style
  ...ListKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...BlockMenuKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  MarkdownPlugin,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export function TranscriptEditor({ initialContent, onSave, readOnly = false }: TranscriptEditorProps) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(initialContent);

  const initialValue = React.useMemo(() => textToSlateValue(initialContent), [initialContent]);

  const editor = usePlateEditor({
    plugins: TranscriptEditorPlugins,
    value: initialValue,
  });

  const handleSave = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return;
    setSaveState('saving');
    try {
      await onSave(text);
      lastSavedRef.current = text;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('idle');
    }
  }, [onSave]);

  // Auto-save on changes with debounce
  const handleEditorChange = useCallback(() => {
    if (readOnly) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const text = slateValueToText(editor.children as any[]);
      handleSave(text);
    }, 2000);
  }, [editor, handleSave, readOnly]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Word count
  const wordCount = React.useMemo(() => {
    const text = slateValueToText(editor.children as any[]);
    return text.split(/\s+/).filter(Boolean).length;
  }, [editor.children]);

  return (
    <div className="flex flex-col rounded-xl border border-border/60 overflow-hidden bg-card">
      <Plate editor={editor} readOnly={readOnly} onChange={() => handleEditorChange()}>
        <EditorContainer variant="default" className="min-h-[300px] max-h-[60vh]">
          <Editor
            variant="default"
            className="text-[15px] leading-[1.8] text-foreground/90"
            placeholder="Start editing your transcript..."
          />
        </EditorContainer>
      </Plate>

      {/* Footer — Status + Word Count */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
        </div>
        <div className="flex items-center gap-2">
          {saveState === 'saving' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving...
            </Badge>
          )}
          {saveState === 'saved' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
              <Check className="h-2.5 w-2.5" />
              Saved
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-[10px] px-2 ml-2" 
            onClick={() => handleSave(slateValueToText(editor.children as any[]))}
            disabled={saveState === 'saving'}
          >
            Save Transcript
          </Button>
        </div>
      </div>
    </div>
  );
}
