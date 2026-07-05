-- إصلاح سريع: أعمدة ناقصة في leave_requests
-- شغّل هذا في Supabase SQL Editor ثم Reload schema

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS manager_notes TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

NOTIFY pgrst, 'reload schema';
