
-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete messages from their own conversations
CREATE POLICY "Users can delete own conversation messages"
ON public.messages
FOR DELETE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own group sessions
CREATE POLICY "Users can delete own group sessions"
ON public.group_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete group session agents for their sessions
CREATE POLICY "Users can delete own group session agents"
ON public.group_session_agents
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.group_sessions WHERE user_id = auth.uid()
  )
);

-- Allow users to delete group messages for their sessions
CREATE POLICY "Users can delete own group messages"
ON public.group_messages
FOR DELETE
USING (
  session_id IN (
    SELECT id FROM public.group_sessions WHERE user_id = auth.uid()
  )
);
