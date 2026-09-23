-- ============================================================
-- 025_enterprise_rbac_schema.sql
-- Enterprise Role-Based Access Control (RBAC), Multi-Tenant Team
-- Management, Granular Permissions, and Immutable Audit Logging
-- ============================================================

-- 1. Create Organization Roles Master Table
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id TEXT PRIMARY KEY, -- e.g. 'client_owner', 'client_procurement_manager', 'admin_rfq_monitor'
    scope TEXT NOT NULL CHECK (scope IN ('platform', 'client', 'vendor')),
    name_ar TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_roles_select_all" ON public.organization_roles FOR SELECT USING (true);

-- 2. Create Role-Permissions Mapping Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id TEXT NOT NULL REFERENCES public.organization_roles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_select_all" ON public.role_permissions FOR SELECT USING (true);

-- 3. Create Organizations Table (Multi-Tenant Hub)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('client', 'vendor')),
    name TEXT NOT NULL,
    cr_number TEXT,
    tax_number TEXT,
    iban TEXT,
    city TEXT DEFAULT 'الرياض',
    address TEXT,
    phone TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected', 'expired')),
    verified_badge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_member" ON public.organizations FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
);

-- 4. Create Organization Memberships Table (Multi-User Teams)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    role_id TEXT NOT NULL REFERENCES public.organization_roles(id),
    custom_permissions TEXT[] DEFAULT '{}'::TEXT[],
    explicit_denies TEXT[] DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'revoked')),
    invitation_token_hash TEXT UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    invited_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_own_org" ON public.organization_members FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
    OR organization_id IN (
        SELECT id FROM public.organizations WHERE owner_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
);

-- 5. Create Immutable Staff Audit Logs Table (Append-Only Enterprise Security)
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_membership_id UUID,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    target_user_id UUID,
    before_data JSONB DEFAULT '{}'::JSONB,
    after_data JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- Append-only policy: authenticated users can insert their audit trails, read own org logs, NO update, NO delete
CREATE POLICY "audit_logs_select_org" ON public.staff_audit_logs FOR SELECT USING (
    actor_user_id = auth.uid()
    OR organization_id IN (
        SELECT id FROM public.organizations WHERE owner_user_id = auth.uid()
    )
    OR organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role_id IN ('client_owner', 'vendor_owner', 'client_rfq_supervisor', 'client_accountant')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "audit_logs_insert" ON public.staff_audit_logs FOR INSERT WITH CHECK (true);

-- Explicitly disallow UPDATE and DELETE on audit logs to guarantee immutability
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.staff_audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.staff_audit_logs;

-- 6. Pre-populate System Roles
INSERT INTO public.organization_roles (id, scope, name_ar, description_ar)
VALUES
    -- Platform Admin Staff Roles
    ('platform_super_admin', 'platform', 'المدير العام للمنصة', 'صلاحيات كاملة وغير مقيدة على كافة أقسام وإعدادات المنصة'),
    ('platform_rfq_monitor', 'platform', 'مراقب طلبات التسعير والعمليات', 'مراقبة تدفق الطلبات والعروض، وفحص الأسعار، ومتابعة النشاط اللحظي'),
    ('platform_accountant', 'platform', 'المحاسب المالي العام', 'إدارة العمليات المالية، الفواتير، عمولات المنصة، ومطابقة الحسابات'),
    ('platform_compliance', 'platform', 'مسؤول التوثيق والامتثال', 'مراجعة واعتماد السجلات التجارية، الرخص، وعناوين الفروع المعتمدة'),
    ('platform_support', 'platform', 'أخصائي خدمة العملاء والنزاعات', 'حل تذاكر الدعم والنزاعات ومتابعة بلاغات التأخير والإرجاع'),

    -- Enterprise Client Roles
    ('client_owner', 'client', 'مالك المنشأة / المدير العام', 'إدارة كاملة لحساب المنشأة، الصلاحيات، الفواتير، والميزانيات'),
    ('client_procurement_manager', 'client', 'مدير المشتريات', 'إنشاء وإدارة طلبات التسعير، قبول العروض، واعتماد الشراء والدفع'),
    ('client_rfq_supervisor', 'client', 'مراقب طلبات التسعير والنشاط', 'استعراض ومراقبة الطلبات والعروض والتقارير المالية بدون صلاحية الشراء'),
    ('client_accountant', 'client', 'محاسب المنشأة', 'استعراض الفواتير الضريبية، شحن المحفظة، ومتابعة القيود والضرائب'),
    ('client_technician', 'client', 'فني الورشة / طالب القطع', 'إنشاء مسودات طلبات القطع ومتابعة استلام الشحنات بدون صلاحيات مالية'),

    -- Vendor Store Roles
    ('vendor_owner', 'vendor', 'مالك المتجر / المعرض', 'إدارة متكاملة لحساب المتجر، الفروع، سحب الأرباح، وفريق المبيعات'),
    ('vendor_sales_agent', 'vendor', 'مسؤول التسعير والمبيعات', 'مراقبة رادار الطلبات، إرسال وتعديل عروض الأسعار، وتحديد الضمان'),
    ('vendor_warehouse_clerk', 'vendor', 'أمين المستودع وتجهيز القطع', 'تجهيز القطع، تسليم الشحنات للعميل أو المندوب، ورفع بوليصات الشحن'),
    ('vendor_accountant', 'vendor', 'محاسب مبيعات المتجر', 'استعراض الفواتير، كشف حساب الأرباح، ورفع طلبات سحب الرصيد')
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    description_ar = EXCLUDED.description_ar;

-- 7. Pre-populate Granular Role-Permissions
INSERT INTO public.role_permissions (role_id, permission_key)
VALUES
    -- Platform Super Admin
    ('platform_super_admin', 'admin:system_settings'),
    ('platform_super_admin', 'admin:manage_users'),
    ('platform_super_admin', 'admin:manage_couriers'),
    ('platform_super_admin', 'admin:verify_users'),
    ('platform_super_admin', 'admin:view_audit_logs'),
    ('platform_super_admin', 'rfqs:view_all'),
    ('platform_super_admin', 'rfqs:manage'),
    ('platform_super_admin', 'quotes:view_all'),
    ('platform_super_admin', 'finance:view_all'),
    ('platform_super_admin', 'finance:audit_vat'),

    -- Platform RFQ Monitor
    ('platform_rfq_monitor', 'rfqs:view_all'),
    ('platform_rfq_monitor', 'quotes:view_all'),
    ('platform_rfq_monitor', 'orders:view_all'),
    ('platform_rfq_monitor', 'audit:view'),

    -- Platform Accountant
    ('platform_accountant', 'finance:view_all'),
    ('platform_accountant', 'finance:audit_vat'),
    ('platform_accountant', 'finance:export_reports'),
    ('platform_accountant', 'orders:view_all'),

    -- Platform Compliance
    ('platform_compliance', 'admin:verify_users'),
    ('platform_compliance', 'admin:view_profiles'),
    ('platform_compliance', 'audit:view'),

    -- Platform Support
    ('platform_support', 'orders:view_all'),
    ('platform_support', 'orders:dispute'),
    ('platform_support', 'rfqs:view_all'),

    -- Client Owner
    ('client_owner', 'rfqs:create'),
    ('client_owner', 'rfqs:view'),
    ('client_owner', 'rfqs:update'),
    ('client_owner', 'rfqs:cancel'),
    ('client_owner', 'quotes:view'),
    ('client_owner', 'quotes:accept'),
    ('client_owner', 'quotes:reject'),
    ('client_owner', 'orders:view'),
    ('client_owner', 'orders:dispute'),
    ('client_owner', 'finance:view'),
    ('client_owner', 'finance:invoice'),
    ('client_owner', 'finance:payment'),
    ('client_owner', 'team:view'),
    ('client_owner', 'team:invite'),
    ('client_owner', 'team:update'),
    ('client_owner', 'team:remove'),
    ('client_owner', 'audit:view'),

    -- Client Procurement Manager
    ('client_procurement_manager', 'rfqs:create'),
    ('client_procurement_manager', 'rfqs:view'),
    ('client_procurement_manager', 'rfqs:update'),
    ('client_procurement_manager', 'rfqs:cancel'),
    ('client_procurement_manager', 'quotes:view'),
    ('client_procurement_manager', 'quotes:accept'),
    ('client_procurement_manager', 'quotes:reject'),
    ('client_procurement_manager', 'orders:view'),
    ('client_procurement_manager', 'finance:view'),
    ('client_procurement_manager', 'finance:payment'),

    -- Client RFQ Supervisor / Monitor
    ('client_rfq_supervisor', 'rfqs:view'),
    ('client_rfq_supervisor', 'quotes:view'),
    ('client_rfq_supervisor', 'orders:view'),
    ('client_rfq_supervisor', 'audit:view'),

    -- Client Accountant
    ('client_accountant', 'finance:view'),
    ('client_accountant', 'finance:invoice'),
    ('client_accountant', 'finance:payment'),
    ('client_accountant', 'orders:view'),

    -- Client Technician
    ('client_technician', 'rfqs:create'),
    ('client_technician', 'rfqs:view'),
    ('client_technician', 'orders:view'),

    -- Vendor Owner
    ('vendor_owner', 'quotes:view_radar'),
    ('vendor_owner', 'quotes:create'),
    ('vendor_owner', 'quotes:update'),
    ('vendor_owner', 'orders:view'),
    ('vendor_owner', 'orders:update_status'),
    ('vendor_owner', 'orders:dispatch'),
    ('vendor_owner', 'finance:view'),
    ('vendor_owner', 'finance:invoice'),
    ('vendor_owner', 'finance:payout'),
    ('vendor_owner', 'finance:bank_account'),
    ('vendor_owner', 'branch:manage_location'),
    ('vendor_owner', 'team:view'),
    ('vendor_owner', 'team:invite'),
    ('vendor_owner', 'team:update'),
    ('vendor_owner', 'team:remove'),
    ('vendor_owner', 'audit:view'),

    -- Vendor Sales Agent
    ('vendor_sales_agent', 'quotes:view_radar'),
    ('vendor_sales_agent', 'quotes:create'),
    ('vendor_sales_agent', 'quotes:update'),
    ('vendor_sales_agent', 'orders:view'),

    -- Vendor Warehouse Clerk
    ('vendor_warehouse_clerk', 'orders:view'),
    ('vendor_warehouse_clerk', 'orders:update_status'),
    ('vendor_warehouse_clerk', 'orders:dispatch'),

    -- Vendor Accountant
    ('vendor_accountant', 'finance:view'),
    ('vendor_accountant', 'finance:invoice'),
    ('vendor_accountant', 'orders:view')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- 8. Safe Non-Destructive Backfill for Existing Profiles
DO $$
DECLARE
    prof RECORD;
    org_id UUID;
    role_key TEXT;
BEGIN
    FOR prof IN SELECT id, full_name, phone, role, company_name, city, address, cr_number, tax_number, iban FROM public.profiles LOOP
        -- Check if organization already exists for this user
        SELECT id INTO org_id FROM public.organizations WHERE owner_user_id = prof.id LIMIT 1;
        
        IF org_id IS NULL THEN
            INSERT INTO public.organizations (
                owner_user_id,
                type,
                name,
                cr_number,
                tax_number,
                iban,
                city,
                address,
                phone,
                verification_status,
                verified_badge
            ) VALUES (
                prof.id,
                COALESCE(prof.role, 'client'),
                COALESCE(prof.company_name, prof.full_name, 'المنشأة الرئيسية'),
                prof.cr_number,
                prof.tax_number,
                prof.iban,
                COALESCE(prof.city, 'الرياض'),
                prof.address,
                prof.phone,
                'approved',
                true
            ) RETURNING id INTO org_id;
        END IF;

        -- Assign default Owner role
        role_key := CASE WHEN prof.role = 'vendor' THEN 'vendor_owner' ELSE 'client_owner' END;

        -- Ensure member record exists for the owner
        IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = org_id AND user_id = prof.id) THEN
            INSERT INTO public.organization_members (
                organization_id,
                user_id,
                email,
                phone,
                full_name,
                role_id,
                status,
                accepted_at
            ) VALUES (
                org_id,
                prof.id,
                prof.id::TEXT || '@rfqsa.tech',
                prof.phone,
                prof.full_name,
                role_key,
                'active',
                NOW()
            );
        END IF;
    END LOOP;
END;
$$;
