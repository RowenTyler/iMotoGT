-- Row Level Security Policies for iMoto Admin Ecosystem
-- These policies enforce role-based access control at the database level

-- Enable RLS on all tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  super_admin_emails TEXT[] := ARRAY['rowenrichardson@gmail.com', 'richardson.rowen@gmail.com', 'tyler.rowend@gmail.com'];
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email = ANY(super_admin_emails)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is any admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_super_admin(user_id) OR EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = user_id 
    AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  IF is_super_admin(user_id) THEN
    RETURN 'SUPER_ADMIN';
  END IF;
  
  RETURN COALESCE(
    (SELECT role FROM admin_roles WHERE user_id = user_id LIMIT 1),
    (SELECT role FROM dealer_employees WHERE user_id = user_id LIMIT 1),
    'USER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ADMIN ROLES POLICIES
-- Super admins and admins can manage admin roles
CREATE POLICY admin_roles_manage ON admin_roles
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY admin_roles_view_own ON admin_roles
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- AUDIT LOG POLICIES
-- Admins can read audit logs, all entries logged automatically
CREATE POLICY audit_log_read_admin ON admin_audit_log
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY audit_log_insert ON admin_audit_log
  FOR INSERT
  WITH CHECK (is_admin(admin_id));

-- DEALER PROFILES POLICIES
-- Super admins can view all dealers
-- Admins can view dealers
-- Dealer owners can view their own
-- Users can view public dealer info
CREATE POLICY dealer_profiles_view_all_admin ON dealer_profiles
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY dealer_profiles_view_owner ON dealer_profiles
  FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM dealer_employees 
      WHERE dealer_id = dealer_profiles.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY dealer_profiles_view_public ON dealer_profiles
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY dealer_profiles_update_owner ON dealer_profiles
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY dealer_profiles_insert ON dealer_profiles
  FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_admin(auth.uid()));

-- DEALER APPLICATIONS POLICIES
-- Admins can view all applications
-- Users can view/create their own
CREATE POLICY dealer_applications_view_admin ON dealer_applications
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY dealer_applications_view_owner ON dealer_applications
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY dealer_applications_insert_user ON dealer_applications
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY dealer_applications_update_admin ON dealer_applications
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DEALER EMPLOYEES POLICIES
-- Dealer owners can manage their employees
-- Admins can manage all employees
CREATE POLICY dealer_employees_manage_owner ON dealer_employees
  FOR ALL
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM dealer_profiles 
      WHERE id = dealer_employees.dealer_id 
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM dealer_profiles 
      WHERE id = dealer_employees.dealer_id 
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY dealer_employees_view_own ON dealer_employees
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- BLOGS POLICIES
-- Super admins and admins can manage all blogs
-- Authors can manage their own drafts
-- Anyone can view published blogs
CREATE POLICY blogs_manage_admin ON blogs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY blogs_author_manage_draft ON blogs
  FOR ALL
  USING (
    author_id = auth.uid() AND status = 'draft' OR is_admin(auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid() AND status = 'draft' OR is_admin(auth.uid())
  );

CREATE POLICY blogs_view_published ON blogs
  FOR SELECT
  USING (status = 'published' OR author_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY blogs_insert_author ON blogs
  FOR INSERT
  WITH CHECK (author_id = auth.uid() OR is_admin(auth.uid()));

-- BLOG BLOCKS POLICIES
-- Can only access blocks of blogs the user has access to
CREATE POLICY blog_blocks_manage ON blog_blocks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blogs 
      WHERE blogs.id = blog_blocks.blog_id 
      AND (
        is_admin(auth.uid()) OR 
        author_id = auth.uid() OR 
        status = 'published'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blogs 
      WHERE blogs.id = blog_blocks.blog_id 
      AND (
        is_admin(auth.uid()) OR 
        author_id = auth.uid()
      )
    )
  );

-- SAVED BLOGS POLICIES
-- Users can only manage their own saved blogs
CREATE POLICY saved_blogs_manage ON saved_blogs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- REVIEWS POLICIES
-- Super admins can manage all reviews
-- Authors can manage their own drafts
-- Anyone can view published reviews
CREATE POLICY reviews_manage_admin ON reviews
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY reviews_author_manage ON reviews
  FOR ALL
  USING (
    author_id = auth.uid() OR is_admin(auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid() OR is_admin(auth.uid())
  );

CREATE POLICY reviews_view_published ON reviews
  FOR SELECT
  USING (status = 'published' OR author_id = auth.uid() OR is_admin(auth.uid()));

-- ANALYTICS EVENTS POLICIES
-- Admins can view analytics
-- Users can view their own events
CREATE POLICY analytics_events_insert ON analytics_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY analytics_events_view_admin ON analytics_events
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY analytics_events_view_own ON analytics_events
  FOR SELECT
  USING (user_id = auth.uid());

-- CONTENT MODERATION QUEUE POLICIES
-- Only admins can access moderation queue
CREATE POLICY content_moderation_queue_admin ON content_moderation_queue
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
