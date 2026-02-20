
-- Create storage bucket for agent images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agent-images', 'agent-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Agent images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload agent images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-images');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update agent images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-images');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete agent images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-images');
