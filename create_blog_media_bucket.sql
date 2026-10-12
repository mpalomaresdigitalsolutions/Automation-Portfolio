-- ========================================================
-- SUPABASE STORAGE BUCKET: blog-media
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query)
-- ========================================================

-- 1. Create the 'blog-media' public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  52428800, -- 50 MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800;

-- 2. Storage RLS Policies: Allow public read access
DROP POLICY IF EXISTS "Public can view blog media" ON storage.objects;
CREATE POLICY "Public can view blog media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'blog-media');

-- 3. Storage RLS Policies: Allow authenticated users to upload media
DROP POLICY IF EXISTS "Authenticated users can upload blog media" ON storage.objects;
CREATE POLICY "Authenticated users can upload blog media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-media');

-- 4. Storage RLS Policies: Allow authenticated users to update media
DROP POLICY IF EXISTS "Authenticated users can update blog media" ON storage.objects;
CREATE POLICY "Authenticated users can update blog media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-media');

-- 5. Storage RLS Policies: Allow authenticated users to delete media
DROP POLICY IF EXISTS "Authenticated users can delete blog media" ON storage.objects;
CREATE POLICY "Authenticated users can delete blog media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-media');
