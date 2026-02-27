-- Add favorites support to conversations and group_sessions
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.group_sessions ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Allow users to update their own conversations (for toggling favorite)
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);