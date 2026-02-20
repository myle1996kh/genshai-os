
-- Create custom agents table (beyond the static data/agents.ts)
CREATE TABLE IF NOT EXISTS public.custom_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  era text,
  domain text NOT NULL DEFAULT 'Custom',
  tagline text,
  image_url text,
  accent_color text DEFAULT '42 80% 52%',
  -- 7-layer Cognitive OS blueprint
  layer_core_values text,
  layer_mental_models text,
  layer_reasoning_patterns text,
  layer_emotional_stance text,
  layer_language_dna text,
  layer_decision_history text,
  layer_knowledge_base text,
  -- Simple arrays for conversation starters
  conversation_starters text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all agents"
  ON public.custom_agents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pro users can create and manage their own agents
CREATE POLICY "Pro users can manage own agents"
  ON public.custom_agents FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Anyone can view public agents
CREATE POLICY "Anyone can view public agents"
  ON public.custom_agents FOR SELECT
  USING (is_public = true AND is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_custom_agents_updated_at
  BEFORE UPDATE ON public.custom_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for profiles updated_at (if not already there)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for subscriptions updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for plans updated_at  
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
