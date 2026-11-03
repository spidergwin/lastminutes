'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Clock, Search, Pencil, Check, X } from 'lucide-react';
import {
  TranscriptSegment,
  getSpeakerColor,
  normalizeSpeakerLabel,
  formatTimestamp,
  computeSpeakerStats,
} from '@/lib/format-transcript';

interface MeetingTranscriptViewProps {
  segments: TranscriptSegment[];
  speakers: string[];
  duration?: number;
  /** Called when a speaker is renamed. Key = old label, value = new label */
  onRenameSpeaker?: (oldName: string, newName: string) => void;
  /** Called when a segment's text is edited */
  onEditSegmentText?: (index: number, newText: string) => void;
}

export function MeetingTranscriptView({
  segments,
  speakers,
  duration,
  onRenameSpeaker,
  onEditSegmentText,
}: MeetingTranscriptViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});

  const normalizedSpeakers = useMemo(
    () => speakers.map((s) => normalizeSpeakerLabel(s)),
    [speakers]
  );

  const speakerStats = useMemo(() => computeSpeakerStats(segments), [segments]);

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter(
      (seg) =>
        seg.text.toLowerCase().includes(q) ||
        normalizeSpeakerLabel(seg.speaker).toLowerCase().includes(q)
    );
  }, [segments, searchQuery]);

  const getDisplayName = (speaker: string) => {
    const normalized = normalizeSpeakerLabel(speaker);
    return speakerNames[normalized] || normalized;
  };

  const handleStartRename = (speaker: string) => {
    setEditingSpeaker(speaker);
    setEditName(speakerNames[speaker] || speaker);
  };

  const handleSaveRename = () => {
    if (!editingSpeaker || !editName.trim()) return;
    const newNames = { ...speakerNames, [editingSpeaker]: editName.trim() };
    setSpeakerNames(newNames);
    onRenameSpeaker?.(editingSpeaker, editName.trim());
    setEditingSpeaker(null);
    setEditName('');
  };

  return (
    <div className="flex flex-col rounded-xl border border-border/60 overflow-hidden bg-card">
      {/* Header — Speaker Legend + Search */}
      <div className="px-4 py-3 border-b border-border/40 bg-muted/20 space-y-3">
        {/* Speakers */}
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {normalizedSpeakers.map((speaker) => {
            const color = getSpeakerColor(speaker);
            const displayName = getDisplayName(speaker);
            const isEditing = editingSpeaker === speaker;

            return (
              <div key={speaker} className="flex items-center gap-1">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 w-24 text-xs px-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setEditingSpeaker(null);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={handleSaveRename}
                    >
                      <Check className="h-3 w-3 text-emerald-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => setEditingSpeaker(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-2 py-0.5 font-normal gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${color.bg} ${color.text} ${color.border}`}
                    onClick={() => handleStartRename(speaker)}
                  >
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${color.dot}`} />
                    {displayName}
                    <Pencil className="h-2.5 w-2.5 opacity-50" />
                  </Badge>
                )}
              </div>
            );
          })}
          {duration && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal gap-1 ml-auto">
              <Clock className="h-2.5 w-2.5" />
              {formatTimestamp(duration * 1000)}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Conversation body */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin">
        <div className="p-4 space-y-1">
          {filteredSegments.map((segment, idx) => {
            const speakerLabel = normalizeSpeakerLabel(segment.speaker);
            const displayName = getDisplayName(speakerLabel);
            const color = getSpeakerColor(segment.speaker);
            const prevSpeaker =
              idx > 0 ? normalizeSpeakerLabel(filteredSegments[idx - 1].speaker) : null;
            const isNewSpeaker = speakerLabel !== prevSpeaker;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                className={isNewSpeaker ? 'pt-3' : ''}
              >
                {isNewSpeaker && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${color.dot}`} />
                    <span className={`text-xs font-bold ${color.text}`}>{displayName}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {formatTimestamp(segment.start)}
                    </span>
                  </div>
                )}
                <div className={`pl-5 ${isNewSpeaker ? '' : 'mt-0.5'}`}>
                  <div
                    className="text-sm leading-relaxed text-foreground/90 outline-none focus:ring-1 focus:ring-ring rounded-sm px-1 -ml-1 transition-colors hover:bg-muted/50 cursor-text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.textContent || '';
                      if (newText !== segment.text) {
                        onEditSegmentText?.(idx, newText);
                      }
                    }}
                  >
                    {segment.text}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredSegments.length === 0 && searchQuery && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Footer — Speaker Stats */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-thin text-xs text-muted-foreground">
          {speakerStats.map((stat) => {
            const color = getSpeakerColor(stat.label);
            const displayName = getDisplayName(stat.label);
            const talkPercent =
              speakerStats.reduce((sum, s) => sum + s.talkTimeMs, 0) > 0
                ? Math.round(
                    (stat.talkTimeMs / speakerStats.reduce((sum, s) => sum + s.talkTimeMs, 0)) * 100
                  )
                : 0;

            return (
              <div key={stat.label} className="flex items-center gap-1.5 shrink-0">
                <span className={`inline-flex h-1.5 w-1.5 rounded-full ${color.dot}`} />
                <span className={`font-medium ${color.text}`}>{displayName}</span>
                <span className="tabular-nums">{talkPercent}%</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="tabular-nums">{stat.words} words</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
