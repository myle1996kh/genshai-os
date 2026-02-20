
-- AI Providers table: stores external OpenAI-compatible provider configs
CREATE TABLE public.ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Models table: cached model list from provider
CREATE TABLE public.ai_provider_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, model_id)
);

-- Model Mappings: maps app modules to a specific provider + model
CREATE TABLE public.model_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL UNIQUE,
  module_label TEXT NOT NULL,
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  model_id TEXT,
  is_default_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_mappings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage providers
CREATE POLICY "Admins can manage ai_providers"
  ON public.ai_providers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage provider models
CREATE POLICY "Admins can manage ai_provider_models"
  ON public.ai_provider_models FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins manage mappings
CREATE POLICY "Admins can manage model_mappings"
  ON public.model_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions (service role) can read providers for routing
CREATE POLICY "Service role reads ai_providers"
  ON public.ai_providers FOR SELECT
  USING (true);

CREATE POLICY "Service role reads ai_provider_models"
  ON public.ai_provider_models FOR SELECT
  USING (true);

CREATE POLICY "Service role reads model_mappings"
  ON public.model_mappings FOR SELECT
  USING (true);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column_providers()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_providers();

CREATE TRIGGER update_model_mappings_updated_at
  BEFORE UPDATE ON public.model_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_providers();

-- Seed default module mappings
INSERT INTO public.model_mappings (module_name, module_label, is_default_fallback) VALUES
  ('agent-chat', 'Agent Chat', false),
  ('auto-create-agent', 'Auto-Generate Agent', false),
  ('auto-research', 'Auto Research', false),
  ('knowledge-ingestion', 'Knowledge Ingestion', false),
  ('default', 'Default (Fallback)', true)
ON CONFLICT (module_name) DO NOTHING;
