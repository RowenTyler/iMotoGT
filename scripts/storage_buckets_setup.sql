-- Storage Buckets Setup for iMoto Admin Ecosystem
-- Creates storage buckets for all media types with appropriate access policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('blog-images', 'blog-images', true),
  ('blog-videos', 'blog-videos', true),
  ('review-images', 'review-images', true),
  ('review-videos', 'review-videos', true),
  ('dealer-logos', 'dealer-logos', true),
  ('dealer-banners', 'dealer-banners', true),
  ('vehicle-images', 'vehicle-images', true)
ON CONFLICT DO NOTHING;

-- Enable public access for read operations on public buckets
CREATE POLICY "Allow public read on blog-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Allow public read on blog-videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-videos');

CREATE POLICY "Allow public read on review-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Allow public read on review-videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-videos');

CREATE POLICY "Allow public read on dealer-logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'dealer-logos');

CREATE POLICY "Allow public read on dealer-banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'dealer-banners');

CREATE POLICY "Allow public read on vehicle-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-images');

-- Allow admins to manage blog content
CREATE POLICY "Allow admin write blog-images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-images' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = ANY(ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'])
    )
  );

CREATE POLICY "Allow admin delete blog-images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog-images' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = ANY(ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'])
    )
  );

CREATE POLICY "Allow admin write blog-videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-videos' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = ANY(ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'])
    )
  );

CREATE POLICY "Allow admin delete blog-videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog-videos' AND 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = ANY(ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'])
    )
  );

-- Allow dealers to manage their content
CREATE POLICY "Allow dealer write dealer-logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dealer-logos' AND 
    EXISTS (
      SELECT 1 FROM dealer_employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow dealer delete dealer-logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'dealer-logos' AND 
    EXISTS (
      SELECT 1 FROM dealer_employees de
      WHERE de.user_id = auth.uid()
      AND de.role = 'DEALER_OWNER'
    )
  );

CREATE POLICY "Allow dealer write dealer-banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dealer-banners' AND 
    EXISTS (
      SELECT 1 FROM dealer_employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow dealer delete dealer-banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'dealer-banners' AND 
    EXISTS (
      SELECT 1 FROM dealer_employees de
      WHERE de.user_id = auth.uid()
      AND de.role = 'DEALER_OWNER'
    )
  );

-- Allow all users to upload vehicle images
CREATE POLICY "Allow user write vehicle-images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicle-images' AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow user delete vehicle-images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicle-images' AND 
    auth.uid() IS NOT NULL AND
    (owner = auth.uid() OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = ANY(ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'])
    ))
  );
