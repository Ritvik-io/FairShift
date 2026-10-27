-- ====================================================================
-- FAIRSHIFT: UN SDG 8 WORKFORCE FAIRNESS PLATFORM
-- Production PostgreSQL Schema & Supabase Row Level Security (RLS)
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE industry_type AS ENUM ('construction', 'facilities');
CREATE TYPE user_role AS ENUM ('worker', 'admin');
CREATE TYPE shift_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'flagged');
CREATE TYPE attendance_status AS ENUM ('checked_in', 'completed', 'late', 'overtime', 'missing_checkout', 'flagged');
CREATE TYPE payroll_status AS ENUM ('draft', 'under_review', 'approved', 'paid', 'disputed');
CREATE TYPE safety_category AS ENUM ('equipment', 'electrical', 'slips_trips', 'sanitation', 'fire', 'ppe', 'heat_stress', 'harassment', 'other');
CREATE TYPE safety_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE safety_status AS ENUM ('submitted', 'acknowledged', 'in_progress', 'escalated', 'resolved');
CREATE TYPE fatigue_rule AS ENUM ('insufficient_rest', 'excessive_shift_duration', 'weekly_hours_exceeded', 'consecutive_night_shifts', 'excessive_overtime');

-- 2. ORGANIZATIONS (Multi-Tenant Root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    industry industry_type NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    standard_daily_hours NUMERIC(4,2) DEFAULT 8.00,
    overtime_multiplier NUMERIC(3,2) DEFAULT 1.50,
    max_weekly_hours NUMERIC(4,2) DEFAULT 48.00,
    min_rest_hours NUMERIC(4,2) DEFAULT 11.00,
    currency_symbol VARCHAR(8) DEFAULT '₹',
    emergency_hotline VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORKERS & PROFILES
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code VARCHAR(64) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(128) NOT NULL,
    department VARCHAR(128) NOT NULL,
    site VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL,
    joined_date DATE NOT NULL,
    preferred_language VARCHAR(8) DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, employee_code)
);

-- 4. SHIFTS
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    site_location VARCHAR(255) NOT NULL,
    assigned_worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    planned_hours NUMERIC(4,2) NOT NULL,
    status shift_status DEFAULT 'scheduled',
    required_ppe TEXT[],
    qr_token VARCHAR(128) NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ATTENDANCE RECORDS
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME,
    regular_hours_worked NUMERIC(5,2) DEFAULT 0.00,
    overtime_hours_worked NUMERIC(5,2) DEFAULT 0.00,
    status attendance_status DEFAULT 'checked_in',
    check_in_method VARCHAR(32) DEFAULT 'manual',
    flagged_reason TEXT,
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (org_id, shift_id, worker_id)
);

-- 6. PAYROLL RECORDS
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    regular_hours NUMERIC(6,2) NOT NULL,
    regular_hourly_rate NUMERIC(10,2) NOT NULL,
    base_earnings NUMERIC(12,2) NOT NULL,
    overtime_hours NUMERIC(6,2) NOT NULL,
    overtime_rate NUMERIC(10,2) NOT NULL,
    overtime_earnings NUMERIC(12,2) NOT NULL,
    bonuses NUMERIC(10,2) DEFAULT 0.00,
    deductions NUMERIC(10,2) DEFAULT 0.00,
    estimated_net_pay NUMERIC(12,2) NOT NULL,
    status payroll_status DEFAULT 'under_review',
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYROLL DISCREPANCIES
CREATE TABLE payroll_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payroll_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    discrepancy_type VARCHAR(64) NOT NULL,
    claimed_hours NUMERIC(5,2),
    claimed_amount NUMERIC(10,2),
    reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'submitted',
    admin_response TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SAFETY REPORTS (With Anonymous Shielding)
CREATE TABLE safety_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_code VARCHAR(64) NOT NULL UNIQUE,
    category safety_category NOT NULL,
    severity safety_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_site VARCHAR(255) NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    reporter_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL, -- Anonymized when is_anonymous = true
    reporter_alias VARCHAR(128) DEFAULT 'Worker',
    status safety_status DEFAULT 'submitted',
    voice_transcript TEXT,
    photo_url TEXT,
    assigned_to VARCHAR(128),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SAFETY REPORT UPDATES
CREATE TABLE safety_report_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(128) NOT NULL,
    status safety_status NOT NULL,
    notes TEXT NOT NULL
);

-- 10. DIGITAL SKILL PASSPORT
CREATE TABLE skill_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    issuing_body VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(128),
    verification_date DATE,
    certificate_ref VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FATIGUE ALERTS
CREATE TABLE fatigue_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    rule_triggered fatigue_rule NOT NULL,
    severity VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    evidence TEXT NOT NULL,
    exact_rule_explanation TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. WORKER FEEDBACK
CREATE TABLE worker_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    category VARCHAR(64) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_role user_role NOT NULL,
    action VARCHAR(128) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX idx_shifts_org_worker ON shifts(org_id, assigned_worker_id, date);
CREATE INDEX idx_attendance_org_date ON attendance_records(org_id, date);
CREATE INDEX idx_payroll_org_worker ON payroll_records(org_id, worker_id, period_start);
CREATE INDEX idx_safety_org_status ON safety_reports(org_id, status);
CREATE INDEX idx_fatigue_org_worker ON fatigue_alerts(org_id, worker_id, is_resolved);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatigue_alerts ENABLE ROW LEVEL SECURITY;

-- 1. Tenant Data Isolation: Users only see records belonging to their active org_id
CREATE POLICY org_isolation_shifts ON shifts
    FOR ALL USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::UUID);

CREATE POLICY org_isolation_attendance ON attendance_records
    FOR ALL USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::UUID);

CREATE POLICY org_isolation_payroll ON payroll_records
    FOR ALL USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::UUID);

-- 2. Worker Self-Service: Workers can only view their own attendance & pay
CREATE POLICY worker_view_own_attendance ON attendance_records
    FOR SELECT USING (
        worker_id = auth.uid() OR 
        current_setting('app.user_role', true) = 'admin'
    );

CREATE POLICY worker_view_own_payroll ON payroll_records
    FOR SELECT USING (
        worker_id = auth.uid() OR 
        current_setting('app.user_role', true) = 'admin'
    );

-- 3. Anonymous Safety Reports: Prevent Identity Disclosure to ordinary managers
-- Create a secure view for managers that masks the reporter_worker_id
CREATE OR REPLACE VIEW manager_safety_reports_view AS
SELECT
    id,
    org_id,
    report_code,
    category,
    severity,
    title,
    description,
    location_site,
    is_anonymous,
    CASE 
        WHEN is_anonymous = TRUE THEN NULL
        ELSE reporter_worker_id
    END AS reporter_worker_id,
    CASE 
        WHEN is_anonymous = TRUE THEN 'Shielded Worker (Anonymous)'
        ELSE reporter_alias
    END AS reporter_alias,
    status,
    voice_transcript,
    photo_url,
    assigned_to,
    resolution_notes,
    created_at
FROM safety_reports;
