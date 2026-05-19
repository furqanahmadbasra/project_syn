-- ============================================================
-- Migration 003: Messages Table
-- Stores individual chat messages per conversation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    agent_steps     JSONB,                      -- Array of agent step strings
    confidence_score INTEGER,                  -- 0-10 from Research Agent
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by conversation
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- RLS: users can only see messages in their own conversations
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );
