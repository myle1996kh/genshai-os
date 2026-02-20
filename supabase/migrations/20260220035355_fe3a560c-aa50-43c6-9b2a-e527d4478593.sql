
-- Add session_limit_override to track per-user limits set by admin
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS session_limit_override integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sessions_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_reset timestamp with time zone DEFAULT now();

-- Add admin RLS policy on profiles so admins can read/update all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Track conversations per user (add user_id column)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON public.conversations(agent_id);

-- Update RLS on plans to allow admin updates
CREATE POLICY "Admins can manage plans"
  ON public.plans
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
