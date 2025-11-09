-- Updated Supabase-Compatible Schema
-- Generated on 2025-11-09 12:01:05

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";

-- Ensure schemas exist (for compatibility with Supabase)
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS graphql;

-- =======================================
-- USERS TABLE (linked to auth.users)
-- =======================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(20),
    profile_pic TEXT,
    suburb VARCHAR(100),
    city VARCHAR(100),
    province VARCHAR(100),
    login_method VARCHAR(20) DEFAULT 'email' CHECK (login_method IN ('email', 'google', 'facebook', 'apple')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================
-- VEHICLES TABLE
-- =======================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    transmission VARCHAR(20) NOT NULL CHECK (transmission IN ('Manual', 'Automatic')),
    fuel VARCHAR(20) NOT NULL CHECK (fuel IN ('Petrol', 'Diesel', 'Electric', 'Hybrid')),
    engine_capacity VARCHAR(10),
    body_type VARCHAR(50),
    variant VARCHAR(100),
    description TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    images TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================
-- SAVED VEHICLES TABLE
-- =======================================
CREATE TABLE IF NOT EXISTS public.saved_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, vehicle_id)
);

-- =======================================
-- INDEXES
-- =======================================
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON public.vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON public.vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON public.vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_city_province ON public.vehicles(city, province);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON public.vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_vehicles_user_id ON public.saved_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_vehicles_vehicle_id ON public.saved_vehicles(vehicle_id);

-- =======================================
-- FULL-TEXT SEARCH INDEX
-- =======================================
CREATE INDEX IF NOT EXISTS idx_vehicles_search ON public.vehicles USING gin(
    to_tsvector('english', make || ' ' || model || ' ' || COALESCE(variant, '') || ' ' || COALESCE(description, ''))
);

-- =======================================
-- UPDATE TRIGGERS
-- =======================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =======================================
-- RLS CONFIGURATION
-- =======================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_vehicles ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- VEHICLES POLICIES
CREATE POLICY "Anyone can view active vehicles" ON public.vehicles
    FOR SELECT USING (status = 'active');
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles
    FOR DELETE USING (auth.uid() = user_id);

-- SAVED VEHICLES POLICIES
CREATE POLICY "Users can view their own saved vehicles" ON public.saved_vehicles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save vehicles" ON public.saved_vehicles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave their own saved vehicles" ON public.saved_vehicles
    FOR DELETE USING (auth.uid() = user_id);

-- =======================================
-- AUTH INTEGRATION TRIGGER
-- =======================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        INSERT INTO public.users (id, email, first_name, last_name, login_method)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            CASE 
                WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
                WHEN NEW.raw_app_meta_data->>'provider' = 'facebook' THEN 'facebook'
                WHEN NEW.raw_app_meta_data->>'provider' = 'apple' THEN 'apple'
                ELSE 'email'
            END
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================================
-- STORAGE BUCKETS
-- =======================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('vehicle-storage', 'vehicle-storage', true),
    ('profile-picture', 'profile-picture', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
CREATE POLICY "Anyone can view vehicle images" ON storage.objects
    FOR SELECT USING (bucket_id = 'vehicle-storage');

CREATE POLICY "Authenticated users can upload vehicle images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'vehicle-storage' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own vehicle images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'vehicle-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vehicle images" ON storage.objects
    FOR DELETE USING (bucket_id = 'vehicle-storage' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view profile pictures" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-picture');

CREATE POLICY "Users can upload their own profile picture" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'profile-picture' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture" ON storage.objects
    FOR UPDATE USING (bucket_id = 'profile-picture' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture" ON storage.objects
    FOR DELETE USING (bucket_id = 'profile-picture' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =======================================
-- VAULT SCHEMA (for secrets)
-- =======================================
CREATE TABLE IF NOT EXISTS vault.secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    secret TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vault.secrets IS 'Custom table for secure storage of sensitive information.';
