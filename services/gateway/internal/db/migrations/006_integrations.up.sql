-- Integrations & Infrastructure
CREATE TABLE IF NOT EXISTS recall_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id TEXT UNIQUE NOT NULL, -- Recall UUID
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    recording_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    provider TEXT NOT NULL, -- google, microsoft
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    calendar_email TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- recall, paystack
    event_type TEXT,
    payload JSONB,
    signature_valid BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_checkpoints (
    stream_name TEXT NOT NULL,
    consumer_group TEXT NOT NULL,
    last_id TEXT NOT NULL DEFAULT '0',
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (stream_name, consumer_group)
);

-- Performance Indexes
CREATE INDEX idx_calendar_user_id ON calendar_connections(user_id);
CREATE INDEX idx_recall_bots_meeting_id ON recall_bots(meeting_id);

-- Updated at triggers
CREATE TRIGGER update_recall_bots_updated_at BEFORE UPDATE ON recall_bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_updated_at BEFORE UPDATE ON calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_user_isolation ON calendar_connections
    USING (user_id = current_setting('app.user_id'));
