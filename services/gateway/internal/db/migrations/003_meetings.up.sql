-- Meetings Domain
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    external_event_id TEXT, -- ID from Google/Microsoft calendar
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    meeting_url TEXT,
    platform TEXT, -- zoom, google_meet, teams
    organizer TEXT,
    auto_join_enabled BOOLEAN NOT NULL DEFAULT false,
    bot_status TEXT NOT NULL DEFAULT 'idle', -- idle, scheduled, joining, recording, processing, completed, failed
    bot_id TEXT, -- Recall bot ID
    bot_error TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meeting_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- bot_joined, recording_started, bot_left, error
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_bot_status ON meetings(bot_status);
CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX idx_meeting_events_meeting_id ON meeting_events(meeting_id);

-- Updated at trigger
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_user_isolation ON meetings
    USING (user_id = current_setting('app.user_id'));
