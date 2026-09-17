-- =========================================================================
-- SISTEM REKOD SEMAKAN BUKU - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =========================================================================
-- Arahan: Salin dan tampal (Copy & Paste) SQL ini ke dalam Supabase SQL Editor.
-- Kemudian jalankan (Run) untuk memastikan jadual dan dasar keselamatan siap.
-- =========================================================================

-- 1. Cipta jadual rekod murid: student_records
CREATE TABLE IF NOT EXISTS public.student_records (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    record_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('hantar', 'belum_hantar', 'disemak')),
    points_awarded INTEGER DEFAULT 0,
    remark TEXT,
    work_note TEXT,
    task_title TEXT,
    class_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- UNIQUE CONSTRAINT untuk menyokong operasi UPSERT (onConflict: "student_id,subject_id,record_date")
    CONSTRAINT student_records_student_subject_date_key UNIQUE (student_id, subject_id, record_date)
);

-- Indeks untuk kelajuan pencarian rekod
CREATE INDEX IF NOT EXISTS idx_student_records_lookup 
ON public.student_records (student_id, subject_id, record_date);

CREATE INDEX IF NOT EXISTS idx_student_records_class 
ON public.student_records (class_id, record_date);

-- 2. Konfigurasi Row Level Security (RLS)
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;

-- Polisi SELECT (Membaca rekod)
DROP POLICY IF EXISTS "Allow anon read access" ON public.student_records;
CREATE POLICY "Allow anon read access" 
ON public.student_records 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Polisi INSERT (Menambah rekod baharu)
DROP POLICY IF EXISTS "Allow anon insert access" ON public.student_records;
CREATE POLICY "Allow anon insert access" 
ON public.student_records 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Polisi UPDATE (Mengemaskini rekod sedia ada melalui UPSERT)
DROP POLICY IF EXISTS "Allow anon update access" ON public.student_records;
CREATE POLICY "Allow anon update access" 
ON public.student_records 
FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Polisi DELETE (Pilihan sekiranya perlu memadam rekod)
DROP POLICY IF EXISTS "Allow anon delete access" ON public.student_records;
CREATE POLICY "Allow anon delete access" 
ON public.student_records 
FOR DELETE 
TO anon, authenticated 
USING (true);
