/**
 * Role-Based Access Control Types
 * Defines the complete role hierarchy and permissions for iMoto platform
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DEALER_OWNER' | 'DEALER_MANAGER' | 'DEALER_EMPLOYEE' | 'USER'

export interface RolePermissions {
  // Admin capabilities
  manageUsers: boolean
  manageAdmins: boolean
  manageDealers: boolean
  approveDealers: boolean
  suspendDealers: boolean
  manageBlog: boolean
  manageReviews: boolean
  approveContent: boolean
  moderateVehicles: boolean
  manageStorage: boolean
  viewAnalytics: boolean
  managePlatformSettings: boolean
  manageMetrics: boolean
  manageEmployees: boolean
  
  // Dealer capabilities
  manageOwnVehicles: boolean
  addEmployees: boolean
  editDealerProfile: boolean
  viewDealerMetrics: boolean
  
  // User capabilities
  uploadVehicles: boolean
  editOwnVehicles: boolean
  viewSavedVehicles: boolean
  saveVehicles: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  SUPER_ADMIN: {
    manageUsers: true,
    manageAdmins: true,
    manageDealers: true,
    approveDealers: true,
    suspendDealers: true,
    manageBlog: true,
    manageReviews: true,
    approveContent: true,
    moderateVehicles: true,
    manageStorage: true,
    viewAnalytics: true,
    managePlatformSettings: true,
    manageMetrics: true,
    manageEmployees: true,
    manageOwnVehicles: true,
    addEmployees: true,
    editDealerProfile: true,
    viewDealerMetrics: true,
    uploadVehicles: true,
    editOwnVehicles: true,
    viewSavedVehicles: true,
    saveVehicles: true,
  },
  ADMIN: {
    manageUsers: true,
    manageAdmins: false,
    manageDealers: true,
    approveDealers: true,
    suspendDealers: true,
    manageBlog: true,
    manageReviews: true,
    approveContent: true,
    moderateVehicles: true,
    manageStorage: true,
    viewAnalytics: true,
    managePlatformSettings: false,
    manageMetrics: true,
    manageEmployees: true,
    manageOwnVehicles: false,
    addEmployees: false,
    editDealerProfile: false,
    viewDealerMetrics: false,
    uploadVehicles: false,
    editOwnVehicles: false,
    viewSavedVehicles: false,
    saveVehicles: false,
  },
  DEALER_OWNER: {
    manageUsers: false,
    manageAdmins: false,
    manageDealers: false,
    approveDealers: false,
    suspendDealers: false,
    manageBlog: false,
    manageReviews: false,
    approveContent: false,
    moderateVehicles: false,
    manageStorage: false,
    viewAnalytics: false,
    managePlatformSettings: false,
    manageMetrics: false,
    manageEmployees: true,
    manageOwnVehicles: true,
    addEmployees: true,
    editDealerProfile: true,
    viewDealerMetrics: true,
    uploadVehicles: true,
    editOwnVehicles: true,
    viewSavedVehicles: true,
    saveVehicles: true,
  },
  DEALER_MANAGER: {
    manageUsers: false,
    manageAdmins: false,
    manageDealers: false,
    approveDealers: false,
    suspendDealers: false,
    manageBlog: false,
    manageReviews: false,
    approveContent: false,
    moderateVehicles: false,
    manageStorage: false,
    viewAnalytics: false,
    managePlatformSettings: false,
    manageMetrics: false,
    manageEmployees: false,
    manageOwnVehicles: true,
    addEmployees: false,
    editDealerProfile: false,
    viewDealerMetrics: true,
    uploadVehicles: true,
    editOwnVehicles: true,
    viewSavedVehicles: true,
    saveVehicles: true,
  },
  DEALER_EMPLOYEE: {
    manageUsers: false,
    manageAdmins: false,
    manageDealers: false,
    approveDealers: false,
    suspendDealers: false,
    manageBlog: false,
    manageReviews: false,
    approveContent: false,
    moderateVehicles: false,
    manageStorage: false,
    viewAnalytics: false,
    managePlatformSettings: false,
    manageMetrics: false,
    manageEmployees: false,
    manageOwnVehicles: true,
    addEmployees: false,
    editDealerProfile: false,
    viewDealerMetrics: false,
    uploadVehicles: true,
    editOwnVehicles: true,
    viewSavedVehicles: true,
    saveVehicles: true,
  },
  USER: {
    manageUsers: false,
    manageAdmins: false,
    manageDealers: false,
    approveDealers: false,
    suspendDealers: false,
    manageBlog: false,
    manageReviews: false,
    approveContent: false,
    moderateVehicles: false,
    manageStorage: false,
    viewAnalytics: false,
    managePlatformSettings: false,
    manageMetrics: false,
    manageEmployees: false,
    manageOwnVehicles: false,
    addEmployees: false,
    editDealerProfile: false,
    viewDealerMetrics: false,
    uploadVehicles: true,
    editOwnVehicles: true,
    viewSavedVehicles: true,
    saveVehicles: true,
  },
}

export interface AdminUser {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  created_at: string
  updated_at: string
  last_login?: string
}

export interface DealerApplication {
  id: string
  business_name: string
  owner_id: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface DealerProfile {
  id: string
  business_name: string
  owner_id: string
  logo_url?: string
  banner_url?: string
  description?: string
  rating: number
  status: 'approved' | 'suspended' | 'pending'
  created_at: string
  updated_at: string
}

export interface DealerEmployee {
  id: string
  dealer_id: string
  user_id: string
  role: 'DEALER_OWNER' | 'DEALER_MANAGER' | 'DEALER_EMPLOYEE'
  created_at: string
}

export interface Blog {
  id: string
  title: string
  subtitle: string
  slug: string
  content_json: Record<string, any>
  hero_image?: string
  hero_video?: string
  author_id: string
  status: 'draft' | 'published' | 'archived'
  category: string
  seo_title?: string
  seo_description?: string
  views: number
  saves: number
  published_at?: string
  created_at: string
  updated_at: string
}

export interface BlogBlock {
  id: string
  blog_id: string
  block_type: 'text' | 'image' | 'video' | 'quote' | 'divider' | 'heading' | 'subheading'
  content: string
  position: number
  source_label?: string
  source_url?: string
  created_at: string
}

export interface Review {
  id: string
  title: string
  slug: string
  vehicle_id: string
  review_type: 'written' | 'video' | 'mixed'
  content_json: Record<string, any>
  video_url?: string
  author_id: string
  views: number
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export interface AnalyticsEvent {
  id: string
  user_id?: string
  event_type: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface PlatformMetrics {
  total_blogs: number
  published_blogs: number
  draft_blogs: number
  most_viewed_blogs: Blog[]
  most_saved_blogs: Blog[]
  average_read_time: number
  total_blog_views: number
  
  total_reviews: number
  video_review_views: number
  written_review_views: number
  trending_reviews: Review[]
  
  total_vehicles: number
  active_vehicles: number
  sold_vehicles: number
  pending_vehicles: number
  
  total_users: number
  active_users: number
  new_registrations: number
  saved_vehicles_count: number
  contact_enquiries: number
  
  total_dealers: number
  approved_dealers: number
  pending_dealers: number
  suspended_dealers: number
  
  page_views: number
  ctr: number
  average_session_duration: number
  popular_categories: string[]
}
