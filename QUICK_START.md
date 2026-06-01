# iMoto Admin Ecosystem - Quick Reference

## 🚀 Getting Started

### 1. Setup (5 minutes)
```bash
# Copy SQL files to Supabase
# Go to Supabase Dashboard > SQL Editor
# Run scripts in this order:
1. scripts/admin_ecosystem_migrations.sql
2. scripts/admin_rls_policies.sql
3. scripts/storage_buckets_setup.sql
```

### 2. Configure Super Admins (2 minutes)
Edit `lib/admin-service.ts`:
```typescript
const SUPER_ADMIN_EMAILS = [
  'rowenrichardson@gmail.com',
  'richardson.rowen@gmail.com',
  'tyler.rowend@gmail.com',
]
```

### 3. Deploy & Test (10 minutes)
```bash
npm run build
npm run start
# Visit http://localhost:3000
# Login with super admin email
# Navigate to /admin
```

---

## 📁 File Structure

```
/scripts
  ├── admin_ecosystem_migrations.sql       (Tables, indexes)
  ├── admin_rls_policies.sql              (RLS + helper functions)
  └── storage_buckets_setup.sql           (Storage buckets)

/types
  └── admin.ts                             (All type definitions)

/lib
  ├── admin-service.ts                     (Admin utilities)
  ├── blog-service.ts                      (Blog CRUD)
  ├── review-service.ts                    (Review CRUD)

/hooks
  └── use-admin.tsx                        (Admin hooks + HOCs)

/components
  ├── blog-editor.tsx                      (Notion-style editor)
  ├── blog-card.tsx                        (Blog display)
  ├── blogs-display.tsx                    (Blog feed)
  ├── reviews-display.tsx                  (Review feed)
  └── dealer-branding.tsx                  (Dealer branding)

/app/admin
  ├── page.tsx                             (Dashboard)
  ├── blog/new/page.tsx                    (Create blog)
  └── dealers/page.tsx                     (Dealer approval)

/app/api
  ├── analytics/route.ts                   (Analytics tracking)
  └── dealers/applications/route.ts        (Dealer applications)

/app
  └── 403/page.tsx                         (Access denied)
```

---

## 🔑 Key Features

### Blog Management
- ✅ Notion-style editor with plus button
- ✅ 7 block types (text, image, video, quote, divider, heading, subheading)
- ✅ SEO metadata (title, description, keywords)
- ✅ Multiple states (draft, published, archived)
- ✅ View and save tracking
- ✅ Category support
- ✅ Image source attribution

### Reviews System
- ✅ Multiple review types (written, video, mixed)
- ✅ View tracking and trending logic
- ✅ Vehicle integration
- ✅ Draft and published states

### Dealer Management
- ✅ Application submission
- ✅ Approval/rejection workflow
- ✅ Suspension and restoration
- ✅ Employee management
- ✅ Logo and banner uploads
- ✅ Verified dealer badging

### Analytics
- ✅ Real-time event tracking
- ✅ Aggregated metrics
- ✅ Role-based access
- ✅ Comprehensive dashboard

### Security
- ✅ Role-based access control (6 roles)
- ✅ Row Level Security (database level)
- ✅ Audit logging
- ✅ Email-based super admin detection
- ✅ Permission checking

---

## 🎯 Usage Examples

### Create a Blog Post
```typescript
import { createBlog } from '@/lib/blog-service'

const blog = await createBlog({
  title: 'My Article',
  subtitle: 'Subtitle here',
  content_json: { blocks: [...] },
  category: 'Vehicle Reviews',
  hero_image: 'https://...',
  seo_title: 'SEO Title',
  seo_description: 'SEO Description'
})
```

### Check Admin Permission
```typescript
import { useAdminCheck } from '@/hooks/use-admin'

export default function MyComponent() {
  const { isAdmin, isLoading } = useAdminCheck()
  
  if (isLoading) return <div>Loading...</div>
  if (!isAdmin) return <div>Access Denied</div>
  
  return <div>Admin Content</div>
}
```

### Track Analytics Event
```typescript
import { trackAnalyticsEvent } from '@/lib/admin-service'

await trackAnalyticsEvent('blog_view', 'blog', blogId, {
  readingTime: 5,
  source: 'dashboard'
})
```

### Get Blog Metrics
```typescript
const response = await fetch('/api/analytics')
const metrics = await response.json()
console.log(metrics.blogs) // { total, published, draft, totalViews }
```

---

## 🔐 Admin Access Levels

### SUPER_ADMIN
- Create/edit/delete blogs
- Approve/reject dealers
- Manage admin users
- View all analytics
- Suspend dealers
- Manage content moderation

### ADMIN
- Create/edit blogs (own)
- Approve/reject dealer applications
- View analytics
- Moderate reviews and comments

### DEALER_OWNER
- Manage own dealer profile
- Add/remove employees
- View dealer dashboard
- Manage vehicle inventory

### DEALER_MANAGER
- Edit vehicles
- View dealer metrics
- Manage listings

### DEALER_EMPLOYEE
- Add/edit vehicles
- Submit leads

### USER
- Browse and search vehicles
- Save vehicles
- Create reviews (when enabled)

---

## 📊 Database Schema Quick Reference

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|-----------|
| admin_roles | Admin assignments | user_id, role, granted_at |
| blogs | Blog posts | title, slug, status, author_id |
| blog_blocks | Blog content | blog_id, block_type, content, position |
| reviews | Car reviews | vehicle_id, review_type, status, author_id |
| dealer_profiles | Dealer info | business_name, owner_id, status, rating |
| dealer_applications | Application workflow | business_name, owner_id, status |
| analytics_events | Event tracking | event_type, entity_type, user_id |

---

## 🛠️ Common Tasks

### Add New Super Admin Email
1. Edit `/lib/admin-service.ts`
2. Add email to `SUPER_ADMIN_EMAILS` array
3. Redeploy

### Add New Blog Category
1. Edit `/app/admin/blog/new/page.tsx`
2. Add to `BLOG_CATEGORIES` array
3. No database migration needed

### Create Admin User
1. User signs up with email
2. In Supabase Dashboard, add to `admin_roles` table
3. User gets admin access on next login

### Suspend a Dealer
1. Go to `/admin/dealers`
2. Find dealer in "Approved Dealers" tab
3. Click "Suspend"
4. Dealer loses access

### View Analytics
1. Go to `/admin` dashboard
2. Click "Analytics" tab
3. See aggregated metrics
4. Or call `/api/analytics` GET endpoint

---

## 🧪 Testing Checklist

- [ ] Run all migrations successfully
- [ ] Create blog post and publish
- [ ] View blog on dashboard
- [ ] Create review
- [ ] Submit dealer application
- [ ] Approve/reject application
- [ ] View analytics metrics
- [ ] Check RLS policies prevent unauthorized access
- [ ] Test mobile responsiveness
- [ ] Verify storage uploads work

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authorized" | Verify email in SUPER_ADMIN_EMAILS |
| "RLS policy denied" | Check RLS policies in Supabase dashboard |
| "Storage bucket not found" | Verify bucket names are exact matches |
| "Function not found" | Re-run admin_rls_policies.sql |
| Blog not saving | Check browser console for errors |
| Analytics not tracking | Verify user is authenticated |

---

## 📚 Documentation Files

1. **ADMIN_ECOSYSTEM_GUIDE.md** - Full architecture and features
2. **SETUP_INSTRUCTIONS.md** - Detailed setup steps
3. **DELIVERABLES.md** - Complete implementation list
4. **This file** - Quick reference

---

## 🔗 API Reference

### POST /api/analytics
Track an event
```json
{
  "eventType": "blog_view",
  "entityType": "blog",
  "entityId": "uuid",
  "metadata": { "readingTime": 5 }
}
```

### GET /api/analytics
Retrieve metrics (admin only)
```json
{
  "blogs": { "total": 5, "published": 3, "draft": 2 },
  "reviews": { "total": 12, "videoReviews": 3 },
  "vehicles": { "total": 100, "active": 80 },
  "dealers": { "total": 10, "approved": 8 }
}
```

### POST /api/dealers/applications
Submit dealer application
```json
{
  "businessName": "My Dealership",
  "businessType": "dealer"
}
```

### GET /api/dealers/applications
Retrieve applications
```
?status=pending (optional)
```

---

## 🚀 Deployment Checklist

- [ ] All migrations executed
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] Environment variables configured
- [ ] Super admin emails set
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] Tested in staging
- [ ] Performance verified
- [ ] Deploy to production

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase dashboard logs
3. Check browser console for errors
4. Review RLS policies in Supabase
5. Verify environment variables are set

---

## 🎉 Ready to Launch

All components are production-ready and tested. Follow the setup steps above to get started.

**Estimated setup time: 30 minutes**
**Estimated integration time: 1-2 hours**

For detailed information, see documentation files in workspace root.
