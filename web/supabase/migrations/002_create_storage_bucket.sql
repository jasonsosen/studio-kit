-- Create assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload assets" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Allow authenticated users to view their own assets
CREATE POLICY "Users can view assets" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'assets');

-- Allow authenticated users to delete their own assets
CREATE POLICY "Users can delete assets" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'assets');

-- Allow public read access (for displaying images)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'assets');
