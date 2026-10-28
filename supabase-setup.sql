-- =========================================================================
-- SAMARTH PORTFOLIO // SUPABASE SECURITY & RLS SETUP MIGRATION
-- =========================================================================
-- REVIEW-BEFORE-APPLY WARNING:
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/npzqpcagdtnfuqhyngro/sql)
-- This script safely enables Row Level Security (RLS) on portfolio_data and
-- configures least-privilege storage policies for the portfolio-assets bucket.
-- =========================================================================

-- 1. Ensure portfolio_data table exists with correct schema
CREATE TABLE IF NOT EXISTS public.portfolio_data (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure main row exists if empty
INSERT INTO public.portfolio_data (id, data, updated_at)
VALUES ('main', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.portfolio_data ENABLE ROW LEVEL SECURITY;

-- 3. Clean up any existing policies to prevent naming collisions
DROP POLICY IF EXISTS "Public can read portfolio_data" ON public.portfolio_data;
DROP POLICY IF EXISTS "Authenticated admin can insert portfolio_data" ON public.portfolio_data;
DROP POLICY IF EXISTS "Authenticated admin can update portfolio_data" ON public.portfolio_data;
DROP POLICY IF EXISTS "Authenticated admin can delete portfolio_data" ON public.portfolio_data;
DROP POLICY IF EXISTS "Authenticated admin full access" ON public.portfolio_data;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.portfolio_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.portfolio_data;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.portfolio_data;

-- 4. Policy: Public (anon and authenticated) can SELECT portfolio data
CREATE POLICY "Public can read portfolio_data"
ON public.portfolio_data
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Policy: Authenticated users (Admin via Supabase Auth) can INSERT
CREATE POLICY "Authenticated admin can insert portfolio_data"
ON public.portfolio_data
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Policy: Authenticated users (Admin via Supabase Auth) can UPDATE
CREATE POLICY "Authenticated admin can update portfolio_data"
ON public.portfolio_data
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Policy: Authenticated users (Admin via Supabase Auth) can DELETE
CREATE POLICY "Authenticated admin can delete portfolio_data"
ON public.portfolio_data
FOR DELETE
TO authenticated
USING (true);

-- =========================================================================
-- STORAGE BUCKET: portfolio-assets
-- =========================================================================

-- Ensure storage bucket exists and is public for fast CDN image reads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'portfolio-assets',
    'portfolio-assets',
    true,
    15728640, -- 15MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

-- Clean up storage policies
DROP POLICY IF EXISTS "Public Read portfolio-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload portfolio-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update portfolio-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete portfolio-assets" ON storage.objects;

-- Policy: Anyone can view/read images publicly from portfolio-assets
CREATE POLICY "Public Read portfolio-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'portfolio-assets');

-- Policy: Only Authenticated Admins can upload images
CREATE POLICY "Admin Upload portfolio-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'portfolio-assets');

-- Policy: Only Authenticated Admins can update/overwrite images
CREATE POLICY "Admin Update portfolio-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'portfolio-assets')
WITH CHECK (bucket_id = 'portfolio-assets');

-- Policy: Only Authenticated Admins can delete images
CREATE POLICY "Admin Delete portfolio-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'portfolio-assets');

-- =========================================================================
-- HOW TO CREATE YOUR ADMIN ACCOUNT:
-- 1. In Supabase Dashboard, navigate to: Authentication -> Users
-- 2. Click "Add User" -> "Create User"
-- 3. Enter your Email and Password
-- 4. Check "Auto Confirm User?" so no email verification is needed
-- 5. Log in at /admin/ with those credentials!
-- =========================================================================

