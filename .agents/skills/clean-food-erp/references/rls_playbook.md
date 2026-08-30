# PostgreSQL RLS & Security Playbook — Clean Food CR ERP

> **Rule 1: Database-First Enforcement**
> การควบคุมสิทธิ์และความปลอดภัยทั้งหมดต้องทำที่ระดับฐานข้อมูล (PostgreSQL RLS / RPC) เสมอ

---

## 1. RLS Policy Templates สำหรับ Clean Food ERP

### 1.1 Policy สำหรับ Staff ตาม Role (Admin, Kitchen, Rider, Manager)

```sql
-- เปิดใช้งาน RLS บนตาราง
ALTER TABLE public.erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_production_orders FORCE ROW LEVEL SECURITY;

-- Policy สำหรับ Authenticated Staff ทุกคนอ่านได้
CREATE POLICY "Allow authenticated staff to read production orders"
ON public.erp_production_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
  )
);

-- Policy สำหรับ Admin / Manager / Kitchen ในการสร้าง/แก้ไข
CREATE POLICY "Allow kitchen and managers to manage production orders"
ON public.erp_production_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER', 'KITCHEN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER', 'KITCHEN')
  )
);
```

### 1.2 Policy สำหรับตาราง Multi-Tenant (`erp_tenants`, `erp_tenant_users`, etc.)

```sql
-- ตัวอย่าง Policy สำหรับ erp_tenants
ALTER TABLE public.erp_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff to access their assigned tenant"
ON public.erp_tenants
FOR ALL
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM public.erp_tenant_users
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

-- ตัวอย่าง Policy สำหรับ erp_recipe_steps
ALTER TABLE public.erp_recipe_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow staff to read and edit recipe steps"
ON public.erp_recipe_steps
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## 2. การตรวจสอบ Ghost Policies และ RLS Gaps

Query ตรวจสอบตารางที่มี RLS แต่ไม่มี Policy:
```sql
SELECT c.relname AS tablename
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE n.nspname = 'public' 
  AND c.relkind = 'r' 
  AND c.relrowsecurity = true
GROUP BY c.relname
HAVING COUNT(p.policyname) = 0;
```

---

## 3. RPC Function Security (การใช้ `SECURITY DEFINER`)

- หาก Function ใช้ `SECURITY DEFINER` ต้องระบุ `SET search_path = public, pg_temp;` เสมอ เพื่อป้องกัน Search Path Hijacking
- ต้องตรวจสอบสิทธิ์ `auth.uid()` ภายใน Function ก่อนทำ DML operations
