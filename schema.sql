-- ==========================================
-- SUPABASE DATABASE SCHEMA DDL
-- RUN THIS IN THE SUPABASE SQL EDITOR
-- ==========================================

-- Enable pgcrypto for UUID generation if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES Table (Staff roles & permissions)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CUSTOMERS Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLIENT_ORDERS Table
CREATE TABLE IF NOT EXISTS public.client_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT,
  order_display_name TEXT,
  total_price NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  payment_plan TEXT,
  delivery_date TEXT,
  stage TEXT,
  material_notes TEXT,
  archived BOOLEAN DEFAULT false,
  pending_materials JSONB DEFAULT '{}'::jsonb,
  approval_purchasing BOOLEAN DEFAULT false,
  approval_production BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. INVENTORY Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT UNIQUE NOT NULL,
  wh_1_qty NUMERIC DEFAULT 0, -- Represents the single main warehouse quantity
  wh_2_qty NUMERIC DEFAULT 0, -- Legacy column kept for database compatibility
  wh_3_qty NUMERIC DEFAULT 0, -- Legacy column kept for database compatibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PRICES Table
CREATE TABLE IF NOT EXISTS public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT UNIQUE NOT NULL,
  piece_price NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'بالقطعة',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INVENTORY_LOGS Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  warehouse TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PURCHASE_RECORDS Table
CREATE TABLE IF NOT EXISTS public.purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.client_orders(id) ON DELETE CASCADE,
  material_name TEXT,
  suppliers JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ACCOUNTS Table (Receivables/Payables)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'payable' or 'receivable'
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. EXPENSES Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ORDER_EXPENSES Table
CREATE TABLE IF NOT EXISTS public.order_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.client_orders(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. ORDER_PROGRESS Table (Notes & comments)
CREATE TABLE IF NOT EXISTS public.order_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.client_orders(id) ON DELETE CASCADE,
  progress_date DATE,
  progress_percent NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_display_name TEXT,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ORDERS Table (General work tasks)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  total_quantity NUMERIC DEFAULT 0,
  completed_quantity NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. ORDER_LOGS Table
CREATE TABLE IF NOT EXISTS public.order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow all operations for logged-in users
CREATE POLICY "Allow all actions for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.client_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.inventory_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.purchase_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.order_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.order_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.order_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- AUTHENTICATION TRIGGER FOR PROFILES
-- ==========================================

-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email), 
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- WORKERS & ATTENDANCE SCHEMA
-- ==========================================

-- 15. WORKERS Table
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link system users to workers
  hourly_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. ATTENDANCE Table (Worker attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  work_date DATE DEFAULT CURRENT_DATE NOT NULL, -- Automatically records the current date
  check_in TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- Automatically gets current timestamp
  check_out TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC,
  earnings NUMERIC,
  photo TEXT,      -- Check-in verification photo (Base64)
  photo_out TEXT,  -- Check-out verification photo (Base64)
  photo_break_end TEXT, -- Break-end verification photo (Base64)
  break_start TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Active break start timestamp
  break_deduction_hours NUMERIC DEFAULT 0,          -- Total hours deducted from break overstays
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. ADVANCES Table (Worker cash advances/loans)
CREATE TABLE IF NOT EXISTS public.advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0 NOT NULL,
  notes TEXT,
  advance_date DATE DEFAULT CURRENT_DATE NOT NULL, -- Automatically records current date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow all operations for logged-in users
CREATE POLICY "Allow all actions for authenticated users" ON public.workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.advances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 18. LEAVE REQUESTS Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, approved, rejected
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  manager_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 19. ABSENCE DEDUCTIONS Table (غياب بدون إجازة أو إجازة مرفوضة = خصم يومين)
CREATE TABLE IF NOT EXISTS public.absence_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  work_date DATE NOT NULL,
  deduction_hours NUMERIC DEFAULT 20 NOT NULL,
  deduction_amount NUMERIC DEFAULT 0 NOT NULL,
  reason TEXT NOT NULL, -- no_leave_request, rejected_leave
  leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(worker_id, work_date)
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for authenticated users" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.absence_deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

