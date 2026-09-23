-- ============================================================
-- 026_custom_roles_and_granular_rbac.sql
-- Enhanced Custom Roles Metadata, Indexes, and Strict RLS Policies
-- ============================================================

-- 1. Enhance organization_roles table with enterprise metadata
ALTER TABLE public.organization_roles 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Shield',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create unique index for role id per scope to prevent duplicate slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_roles_scope_id ON public.organization_roles (scope, id);

-- 3. Ensure role_permissions table has index on role_id
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON public.role_permissions (permission_key);

-- 4. Enable and update RLS Policies on organization_roles
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_roles_select_all" ON public.organization_roles;
CREATE POLICY "org_roles_select_all" ON public.organization_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "org_roles_admin_all" ON public.organization_roles;
CREATE POLICY "org_roles_admin_all" ON public.organization_roles 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR admin_role = 'super_admin')
    )
);

-- 5. Enable and update RLS Policies on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select_all" ON public.role_permissions;
CREATE POLICY "role_permissions_select_all" ON public.role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "role_permissions_admin_all" ON public.role_permissions;
CREATE POLICY "role_permissions_admin_all" ON public.role_permissions 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (is_admin = true OR admin_role = 'super_admin')
    )
);
