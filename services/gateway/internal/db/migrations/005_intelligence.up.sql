-- Intelligence Domain
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    type "SummaryType" NOT NULL DEFAULT 'EXECUTIVE_SUMMARY',
    content TEXT NOT NULL, -- Markdown executive summary
    language TEXT NOT NULL DEFAULT 'en',
    metadata JSONB, -- AI model info, tokens, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    assignee TEXT, -- MD, GM, or name
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    detail TEXT NOT NULL,
    maker TEXT, -- MD, HOD
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX idx_summaries_transcript_id ON summaries(transcript_id);
CREATE INDEX idx_action_items_transcript_id ON action_items(transcript_id);
CREATE INDEX idx_decisions_transcript_id ON decisions(transcript_id);

-- Updated at triggers
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY summary_user_isolation ON summaries
    USING (
        transcript_id IN (SELECT id FROM transcripts WHERE user_id = current_setting('app.user_id'))
    );

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_item_user_isolation ON action_items
    USING (
        transcript_id IN (SELECT id FROM transcripts WHERE user_id = current_setting('app.user_id'))
    );

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_user_isolation ON decisions
    USING (
        transcript_id IN (SELECT id FROM transcripts WHERE user_id = current_setting('app.user_id'))
    );
