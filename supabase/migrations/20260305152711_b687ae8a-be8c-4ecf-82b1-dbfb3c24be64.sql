
-- 1. Conversation summaries table
CREATE TABLE public.conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_summarized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages summaries" ON public.conversation_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can view own summaries" ON public.conversation_summaries FOR SELECT USING (
  conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
);

-- 2. Agent skills/tools registry
CREATE TABLE public.agent_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL DEFAULT 'builtin',
  tool_schema JSONB DEFAULT '{}'::jsonb,
  endpoint_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active skills" ON public.agent_skills FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage skills" ON public.agent_skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages skills" ON public.agent_skills FOR ALL USING (true) WITH CHECK (true);

-- 3. Agent-skill assignments (many-to-many)
CREATE TABLE public.agent_skill_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.agent_skills(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);

ALTER TABLE public.agent_skill_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active assignments" ON public.agent_skill_assignments FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage assignments" ON public.agent_skill_assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages assignments" ON public.agent_skill_assignments FOR ALL USING (true) WITH CHECK (true);

-- 4. MCP server connections table
CREATE TABLE public.mcp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none',
  auth_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage MCP connections" ON public.mcp_connections FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active MCP connections" ON public.mcp_connections FOR SELECT USING (is_active = true);
CREATE POLICY "Service role manages MCP connections" ON public.mcp_connections FOR ALL USING (true) WITH CHECK (true);

-- 5. Link MCP connections to skills
ALTER TABLE public.agent_skills ADD COLUMN mcp_connection_id UUID REFERENCES public.mcp_connections(id) ON DELETE SET NULL;
ALTER TABLE public.agent_skills ADD COLUMN mcp_tool_name TEXT;
