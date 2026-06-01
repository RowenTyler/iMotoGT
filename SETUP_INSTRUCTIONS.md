# Supabase Setup Instructions

## Step 1: Apply Database Migrations

### Option A: Using Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your iMoto project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the content from `/scripts/admin_ecosystem_migrations.sql`
6. Paste into the query editor
7. Click **Run**
8. Wait for success message

### Option B: Using Terminal (If installed)

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Navigate to project directory
cd /workspaces/iMotoGT

# Run migrations
supabase db push
```

---

## Step 2: Apply RLS Policies

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy content from `/scripts/admin_rls_policies.sql`
4. Paste and **Run**
5. Wait for completion

---

## Step 3: Setup Storage Buckets

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy content from `/scripts/storage_buckets_setup.sql`
4. Paste and **Run**
5. Verify buckets created in **Storage** section

---

## Step 4: Verify Setup

### Check Tables Created
1. Go to **Database** → **Tables**
2. Verify these tables exist:
   - admin_roles
   - admin_audit_log
   - dealer_profiles
   - dealer_applications
   - dealer_employees
   - blogs
   - blog_blocks
   - saved_blogs
   - reviews
   - analytics_events
   - content_moderation_queue

### Check RLS Policies Enabled
1. Go to **Authentication** → **Policies**
2. Verify policies are listed for each table
3. All tables should show "RLS: Enabled"

### Check Storage Buckets
1. Go to **Storage**
2. Verify these buckets exist:
   - blog-images
   - blog-videos
   - review-images
   - review-videos
   - dealer-logos
   - dealer-banners
   - vehicle-images

---

## Step 5: Grant Super Admin Access

### Set Super Admin Emails (IMPORTANT)

These emails are hardcoded as super admins:
- rowenrichardson@gmail.com
- richardson.rowen@gmail.com
- tyler.rowend@gmail.com

**To add more Super Admins:**

1. Edit `/lib/admin-service.ts`
2. Find the `SUPER_ADMIN_EMAILS` array
3. Add new email addresses
4. Redeploy the application

---

## Step 6: Test Setup

### 1. Login with Super Admin Email
- Visit the application
- Go to `/login`
- Sign in with one of the super admin emails
- Create a new account or sign in if already exists

### 2. Access Admin Dashboard
- Navigate to `/admin`
- Should see "Super Admin Dashboard"
- If redirected to 403, setup incomplete

### 3. Create a Blog Post
- Click "Create Blog Post" or go to `/admin/blog/new`
- Fill in title, subtitle, add blocks
- Click "Publish Article"
- Should redirect to admin dashboard on success

### 4. Check Database Records
1. In Supabase Dashboard, go to **Database** → **blogs**
2. Should see the blog post you just created
3. Check `status` is "published"
4. Check `author_id` matches your user ID

### 5. Test Analytics
- Navigate to `/api/analytics`
- Should see metrics JSON response
- Verify blog count increased

---

## Troubleshooting

### Error: "User not authenticated"
- Make sure you're logged in
- Check browser console for auth errors
- Verify Supabase session is active

### Error: "RLS policy denied"
- Check user role matches table permissions
- Verify RLS policies were applied correctly
- Go to Supabase Dashboard → Authentication → Policies
- Check table-specific policies are enabled

### Error: "Storage bucket not found"
- Verify bucket names are exact matches
- Storage bucket names are case-sensitive
- Check storage policies are enabled

### Error: "Unauthorized to access admin"
- Email must be in `SUPER_ADMIN_EMAILS` array
- Check spelling and case (emails are lowercase)
- User must be created in Supabase auth first

### Error: "Function not found"
- Verify RLS trigger functions were created
- Check for errors during migration execution
- Re-run the migrations script

---

## Post-Setup Configuration

### 1. Update User Metadata
The system stores role info in multiple places:

**Option 1:** User created as Admin via API
```typescript
// Run in admin context
const { error } = await supabase
  .from('admin_roles')
  .insert({ user_id: userId, role: 'ADMIN' })
```

**Option 2:** Update Admin via Dashboard
1. Go to **Authentication** → **Users**
2. Click user's settings
3. Add to `Raw App Metadata`:
```json
{
  "role": "ADMIN"
}
```

### 2. Configure Blog Categories
Edit the list in `/app/admin/blog/new/page.tsx`:
```typescript
const BLOG_CATEGORIES = [
  'Automotive News',
  'Vehicle Reviews',
  'Buying Guides',
  // Add your categories
]
```

### 3. Configure Dealer Application Workflow
Customize in `/app/admin/dealers/page.tsx`:
- Application approval workflow
- Email notifications
- Verification requirements

---

## Environment Variables

Make sure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (Optional, for server functions)
```

---

## Deployment to Production

Before deploying to Vercel/production:

1. **Test all migrations** in development first
2. **Verify RLS policies** with different user roles
3. **Test storage uploads** for all bucket types
4. **Load test** analytics API
5. **Check data privacy** compliance
6. **Review audit logs** setup

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security)
- [Admin API](https://supabase.com/docs/reference/javascript/admin-api)

---

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Review error messages in browser console
3. Verify all migration scripts executed successfully
4. Check RLS policies are enabled on all tables
5. Ensure super admin emails are configured correctly
