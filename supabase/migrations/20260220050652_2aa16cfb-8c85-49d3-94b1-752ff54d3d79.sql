-- Fix: Allow ALL authenticated users to insert custom agents (not just pro)
-- Drop the overly restrictive "Pro users" policy and replace with "Authenticated users"
DROP POLICY IF EXISTS "Pro users can manage own agents" ON public.custom_agents;

-- Allow any authenticated user to INSERT their own agents
CREATE POLICY "Authenticated users can create own agents"
ON public.custom_agents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to UPDATE/DELETE their own agents
CREATE POLICY "Authenticated users can update own agents"
ON public.custom_agents
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete own agents"
ON public.custom_agents
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Allow authenticated users to SELECT their own agents (even private ones)
CREATE POLICY "Authenticated users can view own agents"
ON public.custom_agents
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);