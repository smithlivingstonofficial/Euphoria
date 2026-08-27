-- ==============================================================================
-- EUPHORIA EVENT MANAGEMENT PLATFORM
-- Kalasalingam Academy of Research and Education (KARE)
-- PostgreSQL Database Schema, RLS Policies, Triggers & Atomic RPCs
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS & CONSTANTS
-- ==============================================================================

-- 1.1 ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text
);

INSERT INTO public.roles (id, name, description) VALUES
    ('admin', 'Platform Administrator', 'Full platform administrative access'),
    ('staff_coordinator', 'Staff Coordinator', 'Faculty/Staff overseeing specific events'),
    ('student_coordinator', 'Student Coordinator', 'Student operating event day attendance and logistics'),
    ('participant', 'Participant', 'Default user access for event registration')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ==============================================================================
-- 2. PROFILES TABLE (Linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    mobile_number text,
    gender text CHECK (gender IN ('male', 'female', 'other')),
    participant_type text NOT NULL CHECK (participant_type IN ('internal', 'external')),
    register_number text,
    school text,
    college_name text,
    city text,
    pincode text,
    course text,
    department text,
    year_of_study int CHECK (year_of_study BETWEEN 1 AND 5),
    avatar_url text,
    is_profile_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_participant_type ON public.profiles(participant_type);
CREATE INDEX IF NOT EXISTS idx_profiles_register_number ON public.profiles(register_number);

-- ==============================================================================
-- 3. USER ROLE ASSIGNMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id text NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);

-- ==============================================================================
-- 4. EVENT CATEGORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.event_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    icon text,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. EVENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    short_description text NOT NULL,
    description text NOT NULL,
    rules text,
    school_or_dept text NOT NULL,
    venue text NOT NULL,
    event_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    registration_start timestamptz NOT NULL,
    registration_end timestamptz NOT NULL,
    registration_fee numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (registration_fee >= 0),
    participant_limit int NOT NULL DEFAULT 100 CHECK (participant_limit > 0),
    allow_internal boolean NOT NULL DEFAULT true,
    allow_external boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed')),
    banner_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);

-- ==============================================================================
-- 6. EVENT REGISTRATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_code text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded')),
    qr_secret_nonce text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reg_user ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_code ON public.event_registrations(registration_code);
CREATE INDEX IF NOT EXISTS idx_event_reg_status ON public.event_registrations(status);

-- ==============================================================================
-- 7. PAYMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL UNIQUE REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL CHECK (amount >= 0),
    currency text NOT NULL DEFAULT 'INR',
    provider text NOT NULL,
    order_id text NOT NULL UNIQUE,
    payment_id text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    raw_response jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reg_id ON public.payments(registration_id);

-- ==============================================================================
-- 8. STAFF & STUDENT COORDINATOR ASSIGNMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_event_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.student_coordinator_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignment_event ON public.staff_event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_user ON public.staff_event_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_student_coord_event ON public.student_coordinator_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_student_coord_user ON public.student_coordinator_assignments(user_id);

-- ==============================================================================
-- 9. ATTENDANCE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id uuid NOT NULL UNIQUE REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    scanned_by uuid NOT NULL REFERENCES public.profiles(id),
    scanned_at timestamptz NOT NULL DEFAULT now(),
    scan_method text NOT NULL DEFAULT 'qr_camera' CHECK (scan_method IN ('qr_camera', 'manual_search'))
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON public.attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scanned_by ON public.attendance(scanned_by);

-- ==============================================================================
-- 10. ANNOUNCEMENTS & NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT false,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    link_url text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_announcements_event ON public.announcements(event_id);

-- ==============================================================================
-- 11. AUTH TRIGGER & DOMAIN CLASSIFICATION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_type text;
    v_full_name text;
BEGIN
    -- Derive participant type strictly from email domain
    IF lower(NEW.email) LIKE '%@klu.ac.in' THEN
        v_participant_type := 'internal';
    ELSE
        v_participant_type := 'external';
    END IF;

    v_full_name := coalesce(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        participant_type,
        is_profile_completed
    ) VALUES (
        NEW.id,
        lower(NEW.email),
        v_full_name,
        coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
        v_participant_type,
        false
    ) ON CONFLICT (id) DO NOTHING;

    -- Assign default participant role
    INSERT INTO public.user_role_assignments (user_id, role_id)
    VALUES (NEW.id, 'participant')
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 12. RLS SECURITY HELPER FUNCTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = auth.uid() AND role_id = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_for_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.staff_event_assignments
        WHERE user_id = auth.uid() AND event_id = p_event_id
    ) OR public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_for_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.student_coordinator_assignments
        WHERE user_id = auth.uid() AND event_id = p_event_id
    ) OR public.is_staff_for_event(p_event_id);
$$;

-- ==============================================================================
-- 13. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 13.1 ROLES
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
CREATE POLICY "Roles are viewable by everyone" ON public.roles
    FOR SELECT USING (true);

-- 13.2 PROFILES
DROP POLICY IF EXISTS "Profiles viewable by self, coordinators and admin" ON public.profiles;
CREATE POLICY "Profiles viewable by self, coordinators and admin" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.student_coordinator_assignments WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.staff_event_assignments WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 13.3 USER ROLE ASSIGNMENTS
DROP POLICY IF EXISTS "Users can view own role assignments" ON public.user_role_assignments;
CREATE POLICY "Users can view own role assignments" ON public.user_role_assignments
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify role assignments" ON public.user_role_assignments;
CREATE POLICY "Only admins can modify role assignments" ON public.user_role_assignments
    FOR ALL USING (public.is_admin());

-- 13.4 EVENT CATEGORIES
DROP POLICY IF EXISTS "Categories viewable by public" ON public.event_categories;
CREATE POLICY "Categories viewable by public" ON public.event_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify categories" ON public.event_categories;
CREATE POLICY "Only admins can modify categories" ON public.event_categories
    FOR ALL USING (public.is_admin());

-- 13.5 EVENTS
DROP POLICY IF EXISTS "Published events are viewable by public" ON public.events;
CREATE POLICY "Published events are viewable by public" ON public.events
    FOR SELECT USING (
        status IN ('published', 'registration_open', 'registration_closed', 'ongoing', 'completed')
        OR public.is_admin()
        OR public.is_staff_for_event(id)
    );

DROP POLICY IF EXISTS "Only admins can insert/update/delete events" ON public.events;
CREATE POLICY "Only admins can insert/update/delete events" ON public.events
    FOR ALL USING (public.is_admin());

-- 13.6 EVENT REGISTRATIONS
DROP POLICY IF EXISTS "Users can view own registrations" ON public.event_registrations;
CREATE POLICY "Users can view own registrations" ON public.event_registrations
    FOR SELECT USING (
        auth.uid() = user_id 
        OR public.is_coordinator_for_event(event_id)
    );

DROP POLICY IF EXISTS "Users can insert own registrations" ON public.event_registrations;
CREATE POLICY "Users can insert own registrations" ON public.event_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update registrations" ON public.event_registrations;
CREATE POLICY "Admins can update registrations" ON public.event_registrations
    FOR UPDATE USING (public.is_admin());

-- 13.7 PAYMENTS
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.event_registrations 
            WHERE public.event_registrations.id = payments.registration_id 
            AND public.event_registrations.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- 13.8 STAFF & STUDENT ASSIGNMENTS
DROP POLICY IF EXISTS "Staff assignments viewable by assigned staff and admins" ON public.staff_event_assignments;
CREATE POLICY "Staff assignments viewable by assigned staff and admins" ON public.staff_event_assignments
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage staff assignments" ON public.staff_event_assignments;
CREATE POLICY "Admins can manage staff assignments" ON public.staff_event_assignments
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Student assignments viewable by student, staff of event, and admin" ON public.student_coordinator_assignments;
CREATE POLICY "Student assignments viewable by student, staff of event, and admin" ON public.student_coordinator_assignments
    FOR SELECT USING (
        auth.uid() = user_id 
        OR public.is_staff_for_event(event_id)
    );

DROP POLICY IF EXISTS "Staff and admins can manage student assignments" ON public.student_coordinator_assignments;
CREATE POLICY "Staff and admins can manage student assignments" ON public.student_coordinator_assignments
    FOR ALL USING (public.is_staff_for_event(event_id));

-- 13.9 ATTENDANCE
DROP POLICY IF EXISTS "Coordinators and staff can view attendance" ON public.attendance;
CREATE POLICY "Coordinators and staff can view attendance" ON public.attendance
    FOR SELECT USING (public.is_coordinator_for_event(event_id));

DROP POLICY IF EXISTS "Coordinators and staff can record attendance" ON public.attendance;
CREATE POLICY "Coordinators and staff can record attendance" ON public.attendance
    FOR INSERT WITH CHECK (public.is_coordinator_for_event(event_id));

-- 13.10 ANNOUNCEMENTS & NOTIFICATIONS
DROP POLICY IF EXISTS "Announcements viewable by public" ON public.announcements;
CREATE POLICY "Announcements viewable by public" ON public.announcements
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff and admin can create announcements" ON public.announcements;
CREATE POLICY "Staff and admin can create announcements" ON public.announcements
    FOR INSERT WITH CHECK (
        (event_id IS NULL AND public.is_admin()) 
        OR (event_id IS NOT NULL AND public.is_staff_for_event(event_id))
    );

DROP POLICY IF EXISTS "Users view and update own notifications" ON public.notifications;
CREATE POLICY "Users view and update own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 14. ATOMIC PL/PGSQL RPC FUNCTIONS
-- ==============================================================================

-- 14.1 ATOMIC REGISTRATION WITH CAPACITY LOCKING
CREATE OR REPLACE FUNCTION public.fn_register_event_atomic(
    p_user_id uuid,
    p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_profile RECORD;
    v_current_count int;
    v_existing_reg RECORD;
    v_reg_id uuid;
    v_reg_code text;
    v_nonce text;
    v_payment_status text;
    v_reg_status text;
BEGIN
    -- 1. Check profile completion
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND OR NOT v_profile.is_profile_completed THEN
        RETURN jsonb_build_object('success', false, 'error', 'PROFILE_INCOMPLETE');
    END IF;

    -- 2. Lock event row to guarantee capacity check serialization
    SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND');
    END IF;

    -- 3. Check event status & window
    IF v_event.status NOT IN ('published', 'registration_open') THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_CLOSED');
    END IF;
    IF now() < v_event.registration_start OR now() > v_event.registration_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_WINDOW_EXPIRED');
    END IF;

    -- 4. Check eligibility
    IF v_profile.participant_type = 'internal' AND NOT v_event.allow_internal THEN
        RETURN jsonb_build_object('success', false, 'error', 'INTERNAL_NOT_ALLOWED');
    END IF;
    IF v_profile.participant_type = 'external' AND NOT v_event.allow_external THEN
        RETURN jsonb_build_object('success', false, 'error', 'EXTERNAL_NOT_ALLOWED');
    END IF;

    -- 5. Check duplicate registration
    SELECT * INTO v_existing_reg FROM public.event_registrations 
    WHERE event_id = p_event_id AND user_id = p_user_id;
    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REGISTERED', 'registration_id', v_existing_reg.id);
    END IF;

    -- 6. Check capacity
    SELECT count(*) INTO v_current_count FROM public.event_registrations 
    WHERE event_id = p_event_id AND status = 'confirmed';
    IF v_current_count >= v_event.participant_limit THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_CAPACITY_FULL');
    END IF;

    -- 7. Determine status based on fee
    IF v_event.registration_fee <= 0.00 THEN
        v_payment_status := 'not_required';
        v_reg_status := 'confirmed';
    ELSE
        v_payment_status := 'pending';
        v_reg_status := 'pending';
    END IF;

    -- 8. Generate unique registration code and nonce
    v_reg_code := 'EUPH-' || to_char(now(), 'YY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    v_nonce := encode(gen_random_bytes(16), 'hex');

    -- 9. Insert registration
    INSERT INTO public.event_registrations (
        event_id, user_id, registration_code, status, payment_status, qr_secret_nonce
    ) VALUES (
        p_event_id, p_user_id, v_reg_code, v_reg_status, v_payment_status, v_nonce
    ) RETURNING id INTO v_reg_id;

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_reg_id,
        'registration_code', v_reg_code,
        'status', v_reg_status,
        'payment_required', (v_event.registration_fee > 0.00),
        'fee', v_event.registration_fee
    );
END;
$$;

-- 14.2 ATOMIC ATTENDANCE SCAN & CHECK-IN
CREATE OR REPLACE FUNCTION public.fn_record_attendance_atomic(
    p_coordinator_id uuid,
    p_registration_code text,
    p_event_id uuid,
    p_scan_method text DEFAULT 'qr_camera'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_authorized boolean;
    v_reg RECORD;
    v_user_profile RECORD;
    v_att RECORD;
BEGIN
    -- 1. Check if coordinator is admin, assigned staff, or assigned student coordinator for this event
    SELECT (
        public.is_admin()
        OR EXISTS (SELECT 1 FROM public.staff_event_assignments WHERE user_id = p_coordinator_id AND event_id = p_event_id)
        OR EXISTS (SELECT 1 FROM public.student_coordinator_assignments WHERE user_id = p_coordinator_id AND event_id = p_event_id)
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_FOR_EVENT');
    END IF;

    -- 2. Fetch and lock registration
    SELECT * INTO v_reg FROM public.event_registrations 
    WHERE registration_code = p_registration_code AND event_id = p_event_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_NOT_FOUND');
    END IF;

    IF v_reg.status != 'confirmed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'REGISTRATION_NOT_CONFIRMED', 'status', v_reg.status);
    END IF;

    -- 3. Check for duplicate attendance
    SELECT * INTO v_att FROM public.attendance WHERE registration_id = v_reg.id;
    IF FOUND THEN
        SELECT full_name, email, register_number INTO v_user_profile FROM public.profiles WHERE id = v_reg.user_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_CHECKED_IN',
            'scanned_at', v_att.scanned_at,
            'participant_name', v_user_profile.full_name
        );
    END IF;

    -- 4. Record attendance
    INSERT INTO public.attendance (
        registration_id, event_id, scanned_by, scan_method
    ) VALUES (
        v_reg.id, p_event_id, p_coordinator_id, p_scan_method
    );

    SELECT full_name, email, register_number, college_name, department INTO v_user_profile 
    FROM public.profiles WHERE id = v_reg.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'participant_name', v_user_profile.full_name,
        'register_number', coalesce(v_user_profile.register_number, 'N/A'),
        'college_name', coalesce(v_user_profile.college_name, 'KARE'),
        'department', coalesce(v_user_profile.department, 'N/A'),
        'registration_code', v_reg.registration_code,
        'scanned_at', now()
    );
END;
$$;

-- ==============================================================================
-- 15. SEED CATEGORIES
-- ==============================================================================
INSERT INTO public.event_categories (name, slug, description, icon, display_order) VALUES
    ('Coding & Algorithms', 'coding-algorithms', 'Competitive programming, algorithmic challenges, and bug hunting.', 'Code2', 1),
    ('Artificial Intelligence & ML', 'ai-ml', 'Machine learning model design, prompt engineering, and computer vision.', 'Cpu', 2),
    ('Web & App Development', 'web-app-dev', 'Full-stack web sprints, mobile app innovation, and UI/UX design.', 'Globe', 3),
    ('Robotics & IoT', 'robotics-iot', 'Autonomous line followers, IoT hardware innovation, and drone simulation.', 'Bot', 4),
    ('Cybersecurity & CTF', 'cybersecurity-ctf', 'Capture the flag, vulnerability analysis, and network defense.', 'ShieldAlert', 5),
    ('Paper & Project Presentation', 'presentation', 'Research paper symposiums, capstone project exhibits, and tech talks.', 'FileText', 6)
ON CONFLICT (slug) DO NOTHING;
