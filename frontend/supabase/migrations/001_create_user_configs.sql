-- ============================================================
-- Migration 001: User Configurations Table
-- Stores per-user API keys (Groq + Tavily)
-- Linked to Supabase auth.users via user_id (UUID)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_configs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    groq_api_key    TEXT,
    tavily_api_key  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only have one config row
    CONSTRAINT user_configs_user_id_unique UNIQUE (user_id)
);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_configs_updated_at
    BEFORE UPDATE ON public.user_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security: users can only see and edit their own config
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config"
    ON public.user_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
    ON public.user_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
    ON public.user_configs FOR UPDATE
    USING (auth.uid() = user_id);
