-- ==========================================
-- تشغيل هذا الملف مرة واحدة في Supabase SQL Editor
-- Dashboard → SQL → New query → Paste → Run
-- ==========================================

-- 18. LEAVE REQUESTS Table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  manager_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إضافة أي أعمدة ناقصة (لو الجدول اتعمل قبل كدا بدونهم)
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 19. ABSENCE DEDUCTIONS Table
CREATE TABLE IF NOT EXISTS public.absence_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  work_date DATE NOT NULL,
  deduction_hours NUMERIC DEFAULT 20 NOT NULL,
  deduction_amount NUMERIC DEFAULT 0 NOT NULL,
  reason TEXT NOT NULL,
  leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(worker_id, work_date)
);

ALTER TABLE public.absence_deductions ADD COLUMN IF NOT EXISTS deduction_hours NUMERIC DEFAULT 20;
ALTER TABLE public.absence_deductions ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC DEFAULT 0;
ALTER TABLE public.absence_deductions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.absence_deductions ADD COLUMN IF NOT EXISTS leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL;
ALTER TABLE public.absence_deductions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.absence_deductions;

CREATE POLICY "Allow all actions for authenticated users" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for authenticated users" ON public.absence_deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- تحديث كاش الـ API بعد إنشاء الجداول
NOTIFY pgrst, 'reload schema';
