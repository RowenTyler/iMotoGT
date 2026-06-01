# iMoto Admin Ecosystem - Implementation Guide

## Overview
This document outlines the complete admin ecosystem implementation for the iMoto automotive marketplace platform, including Super Admin access control, blog management, car reviews, dealer management, analytics, and content management.

## Architecture Overview

### Database Layer
- **Admin Management**: `admin_roles`, `admin_audit_log`
- **Blog System**: `blogs`, `blog_blocks`, `saved_blogs`
- **Reviews**: `reviews`
- **Dealers**: `dealer_profiles`, `dealer_applications`, `dealer_employees`
- **Analytics**: `analytics_events`, `content_moderation_queue`

### Security Layer
- Row Level Security (RLS) policies enforce role-based access
- Role hierarchy: SUPER_ADMIN → ADMIN → DEALER_OWNER → DEALER_MANAGER → DEALER_EMPLOYEE → USER
- Super Admin emails: 
  - rowenrichardson@gmail.com
  - richardson.rowen@gmail.com
  - tyler.rowend@gmail.com

### API Layer
- `/api/analytics` - Track events and retrieve metrics
- `/api/dealers/applications` - Manage dealer applications
- `/admin` - Super Admin dashboard
- `/admin/blog/new` - Blog creation page
- `/admin/dealers` - Dealer management center

## Features Implemented

### 1. Role-Based Access Control
**Files:**
- `types/admin.ts` - Role types and permissions
- `lib/admin-service.ts` - Admin operations and utilities
- `hooks/use-admin.tsx` - Admin checking hooks and HOCs

**Permissions by Role:**
```
SUPER_ADMIN: Full platform access (unrestricted)
ADMIN: User management, blog, reviews, content approval, analytics
DEALER_OWNER: Manage own dealer, add employees, manage inventory
DEALER_MANAGER: Edit vehicles, view metrics
DEALER_EMPLOYEE: Add/edit vehicles only
USER: Standard user, can list and browse vehicles
```

### 2. Blog Management System
**Files:**
- `lib/blog-service.ts` - Blog CRUD operations
- `components/blog-editor.tsx` - Notion-style block editor
- `components/blog-card.tsx` - Blog display cards
- `components/blogs-display.tsx` - Blog feed component
- `app/admin/blog/new/page.tsx` - Blog creation interface

**Features:**
- Block-based editor (text, image, video, quote, divider, heading, subheading)
- SEO optimization (title, description, keywords)
- Multiple blog states (draft, published, archived)
- Category management
- View and save tracking
- Image source attribution

**Editor Behavior:**
- Plus button appears on empty lines (Notion-style)
- Click plus to add new block
- Support for image/video embeds with source attribution
- Real-time character counts for SEO fields

### 3. Car Reviews System
**Files:**
- `lib/review-service.ts` - Review CRUD operations
- `components/reviews-display.tsx` - Reviews feed
- Review types: Written, Video, Mixed content

**Features:**
- Multiple review types (written, video, mixed)
- View tracking
- Draft and published states
- Integration with vehicle listings

### 4. Dealer Management
**Files:**
- `lib/admin-service.ts` - Dealer approval/rejection
- `app/admin/dealers/page.tsx` - Approval center
- `components/dealer-branding.tsx` - Dealer display component

**Workflow:**
1. User submits dealer application
2. Super Admin reviews in approval center
3. Admin approves or rejects with reason
4. Approved dealers get own dashboard access
5. Super Admin can suspend/restore dealers

**Dealer Features:**
- Logo and banner uploads
- Employee management
- Vehicle inventory control
- Ratings and badges
- "Verified Dealer" status

### 5. Analytics & Metrics
**Files:**
- `lib/admin-service.ts` - Analytics event tracking
- `app/api/analytics/route.ts` - Metrics API
- Tracks: page views, blog views, reviews, vehicle interests, saves, etc.

**Tracked Metrics:**
- Blog analytics (views, saves, reading time)
- Review analytics (by type and popularity)
- Vehicle analytics (status distribution)
- User analytics (active, new, engagement)
- Dealer analytics (status, ratings)
- Engagement metrics (CTR, session duration)

### 6. Storage Buckets
**Buckets Created:**
- `blog-images` - Blog cover images
- `blog-videos` - Blog video embeds
- `review-images` - Review images
- `review-videos` - Review video embeds
- `dealer-logos` - Dealer brand logos
- `dealer-banners` - Dealer banners
- `vehicle-images` - Vehicle listings

**Access Control:**
- Public read for published content
- Admin write/delete for blog content
- Dealer write/delete for own branding
- User write for vehicle images

## Integration Points

### Dashboard Updates
The main dashboard (`/dashboard`) should be extended to include:
1. Latest blog articles feed (beneath Platform Insights)
2. Trending articles section
3. Featured car reviews section
4. Integration with existing vehicle browsing

### Vehicle Cards
Vehicle listings now display:
- Dealer badge (if dealer-owned)
- Dealer logo and name
- Verification status
- Link to dealer profile

### User Context
When vehicle owned by dealer, display:
- Dealer branding component
- Contact dealer button
- Dealer rating
- Dealer inventory size

## Database Migration
Execute in Supabase:
```bash
1. scripts/admin_ecosystem_migrations.sql
2. scripts/admin_rls_policies.sql
3. scripts/storage_buckets_setup.sql
```

## Environment Setup

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Dependencies
All dependencies already installed:
- @supabase/supabase-js
- @radix-ui/* components
- Tailwind CSS
- React Hook Form

## Usage Examples

### Creating a Blog Post
```typescript
import { createBlog } from '@/lib/blog-service'

const result = await createBlog({
  title: 'Article Title',
  subtitle: 'Subtitle',
  content_json: { blocks: [...] },
  category: 'Vehicle Reviews',
  hero_image: 'https://...',
  seo_title: 'SEO Title',
  seo_description: 'SEO Description'
})
```

### Tracking Analytics
```typescript
import { trackAnalyticsEvent } from '@/lib/admin-service'

await trackAnalyticsEvent('blog_view', 'blog', blogId, {
  readingTime: 5,
  source: 'dashboard'
})
```

### Approving a Dealer
```typescript
import { approveDealerApplication } from '@/lib/admin-service'

const result = await approveDealerApplication(
  applicationId,
  'Business Name',
  ownerId
)
```

### Adding Dealer Employee
```typescript
import { addDealerEmployee } from '@/lib/admin-service'

const result = await addDealerEmployee(
  dealerId,
  userId,
  'DEALER_MANAGER'
)
```

## Security Considerations

### Super Admin Protection
- Email-based identification (configured in SUPER_ADMIN_EMAILS)
- All Super Admin endpoints check admin status
- RLS policies enforce database-level access control
- Audit log tracks all admin actions

### Data Privacy
- Users can manage contact privacy settings
- GDPR compliance with consent management
- Secure token handling for signed URLs
- Rate limiting on public API endpoints

### Content Moderation
- Pending content queue system
- Admin review workflow
- Approval/rejection with reasons
- Public content visibility control

## Performance Optimization

### Caching
- Analytics events batched for efficiency
- Dashboard metrics cached (5 min TTL)
- Blog metadata indexed by status and publish date
- User role cached in session

### Image Optimization
- Supabase Storage compression
- Responsive image sizing
- CDN delivery for all assets
- Signed URLs for private content

### Database Indexing
All tables include strategic indexes:
- `idx_admin_roles_user_id` - Admin lookups
- `idx_blogs_published_at` - Feed ordering
- `idx_analytics_events_created_at` - Metrics queries
- `idx_dealer_profiles_status` - Dealer filtering

## Testing Checklist

### Super Admin Access
- [ ] Log in with super admin email
- [ ] Access admin dashboard (/admin)
- [ ] View analytics
- [ ] Create blog posts
- [ ] Approve dealers
- [ ] Manage content

### Blog Creation
- [ ] Add text block
- [ ] Add image with source attribution
- [ ] Add video embed
- [ ] Save as draft
- [ ] Publish
- [ ] Verify SEO metadata
- [ ] Check on dashboard feed

### Dealer Approval
- [ ] Submit dealer application
- [ ] View pending applications
- [ ] Approve application
- [ ] Verify dealer profile created
- [ ] Test employee management
- [ ] Suspend and restore dealer

### Analytics
- [ ] Track blog views
- [ ] Track review views
- [ ] Retrieve metrics dashboard
- [ ] Check event accuracy

## Remaining Tasks

### Phase 6 Completions
- [ ] Integrate blogs/reviews into main dashboard
- [ ] Metrics dashboard with charts (Recharts)
- [ ] Blog management interface (list/edit/delete)
- [ ] Dealer dashboard for dealers
- [ ] Email notifications for applications
- [ ] Admin notification center
- [ ] Content moderation queue UI
- [ ] Advanced search and filters
- [ ] Performance monitoring

### Future Enhancements
- [ ] Blog comment system
- [ ] Review ratings and helpfulness
- [ ] Dealer verification badges
- [ ] Social media sharing
- [ ] Email newsletter integration
- [ ] Advanced analytics and reporting
- [ ] AI-powered content recommendations
- [ ] Multi-language support

## Support & Troubleshooting

### Common Issues

**Q: Super Admin access not working**
A: Verify email in SUPER_ADMIN_EMAILS array and that user exists in Supabase auth

**Q: RLS policy errors**
A: Ensure policies are applied correctly - check Supabase dashboard RLS section

**Q: Storage bucket issues**
A: Verify bucket names match exactly and policies are enabled

**Q: Analytics not tracking**
A: Check user is authenticated and analyticsservice has proper error handling

## Deployment Checklist

- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Storage buckets created
- [ ] Environment variables configured
- [ ] Super admin emails confirmed
- [ ] Supabase Row Level Security verified
- [ ] Storage policies tested
- [ ] API endpoints tested
- [ ] UI components responsive
- [ ] Performance benchmarked

## Contact & Support
For implementation questions or issues, refer to this documentation or check Supabase console for RLS policy debugging.
