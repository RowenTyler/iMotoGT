-- PHASE 1: Admin Role Management
-- Create admin_roles table for managing platform administrators
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_role ON admin_roles(role);

-- Create audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at);

-- PHASE 2: Dealer Management
-- Create dealer_profiles table
CREATE TABLE IF NOT EXISTS dealer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dealer_profiles_owner_id ON dealer_profiles(owner_id);
CREATE INDEX idx_dealer_profiles_status ON dealer_profiles(status);

-- Create dealer_applications table
CREATE TABLE IF NOT EXISTS dealer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dealer_applications_owner_id ON dealer_applications(owner_id);
CREATE INDEX idx_dealer_applications_status ON dealer_applications(status);

-- Create dealer_employees table for managing dealer staff
CREATE TABLE IF NOT EXISTS dealer_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealer_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('DEALER_OWNER', 'DEALER_MANAGER', 'DEALER_EMPLOYEE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dealer_employees_dealer_id ON dealer_employees(dealer_id);
CREATE INDEX idx_dealer_employees_user_id ON dealer_employees(user_id);
CREATE UNIQUE INDEX idx_dealer_employees_unique ON dealer_employees(dealer_id, user_id);

-- Add dealer_id column to existing vehicles table if not exists
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES dealer_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_dealer_id ON vehicles(dealer_id);

-- PHASE 3: Blog Management
-- Create blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL UNIQUE,
  content_json JSONB NOT NULL DEFAULT '{}',
  hero_image TEXT,
  hero_video TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  category TEXT,
  seo_title TEXT,
  seo_description TEXT,
  views INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blogs_author_id ON blogs(author_id);
CREATE INDEX idx_blogs_status ON blogs(status);
CREATE INDEX idx_blogs_slug ON blogs(slug);
CREATE INDEX idx_blogs_category ON blogs(category);
CREATE INDEX idx_blogs_published_at ON blogs(published_at);

-- Create blog_blocks table for Notion-style blocks
CREATE TABLE IF NOT EXISTS blog_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'video', 'quote', 'divider', 'heading', 'subheading')),
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  source_label TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blog_blocks_blog_id ON blog_blocks(blog_id);
CREATE INDEX idx_blog_blocks_position ON blog_blocks(blog_id, position);

-- Create saved_blogs table
CREATE TABLE IF NOT EXISTS saved_blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_blogs_user_id ON saved_blogs(user_id);
CREATE INDEX idx_saved_blogs_blog_id ON saved_blogs(blog_id);
CREATE UNIQUE INDEX idx_saved_blogs_unique ON saved_blogs(user_id, blog_id);

-- PHASE 4: Review Management
-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('written', 'video', 'mixed')),
  content_json JSONB NOT NULL DEFAULT '{}',
  video_url TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  views INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX idx_reviews_author_id ON reviews(author_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_review_type ON reviews(review_type);

-- PHASE 5: Analytics Tracking
-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_entity ON analytics_events(entity_type, entity_id);

-- PHASE 6: Content Moderation
-- Create content_moderation_queue table
CREATE TABLE IF NOT EXISTS content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'review', 'vehicle')),
  content_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_moderation_queue_status ON content_moderation_queue(status);
CREATE INDEX idx_moderation_queue_created_at ON content_moderation_queue(created_at);

-- PHASE 7: Set up Super Admin accounts
-- Insert initial super admin accounts (these would be managed via Supabase auth UI in production)
-- The user IDs need to match the actual auth.users entries created via Supabase auth
-- For now, this is a placeholder - admins are granted via the Supabase dashboard

-- Grant appropriate permissions by creating admin_roles entries for the super admin emails
-- This is handled in the application layer during user creation/update

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dealer_profiles_updated_at BEFORE UPDATE ON dealer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dealer_applications_updated_at BEFORE UPDATE ON dealer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
