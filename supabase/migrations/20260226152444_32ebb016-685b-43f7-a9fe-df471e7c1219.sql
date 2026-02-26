
-- ============================================================
-- PERSISTENT MEMORY SYSTEM
-- ============================================================

-- Table to store extracted memories about users from conversations
CREATE TABLE public.agent_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id UUID NULL,
  user_session TEXT NULL,
  memory_type TEXT NOT NULL DEFAULT 'fact',  -- fact, preference, topic, insight, personal
  content TEXT NOT NULL,
  importance_score REAL NOT NULL DEFAULT 0.5,  -- 0.0 to 1.0
  source_conversation_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast memory retrieval per agent+user
CREATE INDEX idx_agent_memories_agent_user ON public.agent_memories (agent_id, user_id);
CREATE INDEX idx_agent_memories_agent_session ON public.agent_memories (agent_id, user_session);
CREATE INDEX idx_agent_memories_importance ON public.agent_memories (importance_score DESC);

-- Enable RLS
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Users can view their own memories
CREATE POLICY "Users can view own memories"
  ON public.agent_memories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete own memories"
  ON public.agent_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Service role / edge functions can manage all memories
CREATE POLICY "Service role manages memories"
  ON public.agent_memories FOR ALL
  USING (true)
  WITH CHECK (true);

-- Guest session access (no auth)
CREATE POLICY "Guest session memory access"
  ON public.agent_memories FOR SELECT
  USING (user_id IS NULL AND user_session IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_agent_memories_updated_at
  BEFORE UPDATE ON public.agent_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- GROUP AGENT DEBATES
-- ============================================================

-- Group sessions table
CREATE TABLE public.group_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  user_id UUID NULL,
  user_session TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active, paused, completed
  max_turns INTEGER NOT NULL DEFAULT 10,
  current_turn INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_sessions_user ON public.group_sessions (user_id);
CREATE INDEX idx_group_sessions_session ON public.group_sessions (user_session);

ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own group sessions"
  ON public.group_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create group sessions"
  ON public.group_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own group sessions"
  ON public.group_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role manages group sessions"
  ON public.group_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_group_sessions_updated_at
  BEFORE UPDATE ON public.group_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Agents participating in a group session
CREATE TABLE public.group_session_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_image TEXT NULL,
  turn_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_session_agents_session ON public.group_session_agents (session_id);

ALTER TABLE public.group_session_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read group session agents"
  ON public.group_session_agents FOR SELECT
  USING (true);

CREATE POLICY "Service role manages group session agents"
  ON public.group_session_agents FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert group session agents"
  ON public.group_session_agents FOR INSERT
  WITH CHECK (true);

-- Group messages (extending concept — separate from 1:1 messages)
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  agent_id TEXT NULL,  -- NULL = user message
  agent_name TEXT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',  -- user, assistant, system
  content TEXT NOT NULL,
  turn_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_messages_session ON public.group_messages (session_id, turn_number);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read group messages"
  ON public.group_messages FOR SELECT
  USING (true);

CREATE POLICY "Service role manages group messages"
  ON public.group_messages FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert group messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (true);

-- Enable realtime for group messages (for live debate updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
