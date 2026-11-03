-- Transcripts Domain
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    original_text TEXT,
    source_language TEXT NOT NULL DEFAULT 'en',
    duration INTEGER NOT NULL DEFAULT 0, -- seconds
    word_count INTEGER NOT NULL DEFAULT 0,
    file_url TEXT,
    file_type TEXT, -- audio, video, meeting
    is_public BOOLEAN NOT NULL DEFAULT false,
    speakers TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    speaker TEXT,
    text TEXT NOT NULL,
    language TEXT, -- code switching support (yo, pcm, en)
    embedding vector(1536), -- For semantic search
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX idx_transcript_segments_transcript_id ON transcript_segments(transcript_id);
CREATE INDEX idx_transcript_segments_embedding ON transcript_segments USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Updated at trigger
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY transcript_user_isolation ON transcripts
    USING (user_id = current_setting('app.user_id'));

ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY segment_user_isolation ON transcript_segments
    USING (
        transcript_id IN (SELECT id FROM transcripts WHERE user_id = current_setting('app.user_id'))
    );
