-- ============================================================================
-- Academic Registration Portal — Comprehensive Academic Schema (C0 - C8)
-- Fully reconciled with KLEF R23 2026-27 Even Semester Institutional Data
-- ============================================================================

-- 1. Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
  id TEXT PRIMARY KEY,                       -- e.g. '2026-27-EVEN', '2026-27-EVEN'
  academic_year TEXT NOT NULL,               -- '2026-27'
  semester_code TEXT NOT NULL,               -- 'ODD', 'EVEN'
  semester_number INTEGER NOT NULL,          -- 5, 6
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Specializations Master Table
CREATE TABLE IF NOT EXISTS specializations (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clusters (Cohorts)
CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY,                       -- 'Cluster-1', 'Cluster-2'
  name TEXT NOT NULL,                        -- 'Cluster-1'
  section_start INTEGER NOT NULL,            -- 1, 51
  section_end INTEGER NOT NULL,              -- 50, 100
  section_range TEXT NOT NULL,               -- 'S1 — S50', 'S51 — S100'
  description TEXT,
  is_recommended INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Course Categories
CREATE TABLE IF NOT EXISTS course_categories (
  code TEXT PRIMARY KEY,                     -- 'PRI', 'OE1', 'OE2', 'PE4', 'PE5', 'SCIENCE', 'AUDIT', 'AUC'
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ACADEMIC',
  description TEXT
);

-- 5. Curriculum Buckets (C0 through C8)
CREATE TABLE IF NOT EXISTS buckets (
  id TEXT PRIMARY KEY,                       -- 'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'
  short_code TEXT NOT NULL,                  -- 'PRI', 'OE1', 'OE2', 'PE4', 'SCIENCE', 'AUDIT-1', 'AUDIT-2', 'PE5', 'CONTEST'
  title TEXT NOT NULL,                       -- 'Capstone Project-1', 'Open Elective 1', etc.
  category_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  min_credits INTEGER NOT NULL DEFAULT 2,
  max_credits INTEGER NOT NULL DEFAULT 4,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Courses Catalog (110+ Courses)
CREATE TABLE IF NOT EXISTS courses (
  code TEXT PRIMARY KEY,                     -- e.g. '23IE4053A', 'OECE0003', '23CEC3406'
  name TEXT NOT NULL,
  bucket_id TEXT NOT NULL REFERENCES buckets(id),
  category_code TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  lecture_hours INTEGER NOT NULL DEFAULT 3,
  tutorial_hours INTEGER NOT NULL DEFAULT 0,
  practical_hours INTEGER NOT NULL DEFAULT 0,
  skill_hours INTEGER NOT NULL DEFAULT 0,
  components TEXT NOT NULL DEFAULT '["L"]',
  description TEXT,
  prerequisite TEXT,
  is_crt INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Sections Master Table
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,                       -- e.g. 'S-1', 'S-52', 'S-113'
  section_number INTEGER NOT NULL,
  cluster_id TEXT NOT NULL,
  capacity INTEGER DEFAULT 60,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. Faculty Master Table (420+ Teachers)
CREATE TABLE IF NOT EXISTS faculty (
  id TEXT PRIMARY KEY,                       -- '1177', '6934', 'KLEF0864'
  name TEXT NOT NULL,
  designation TEXT DEFAULT 'Assistant Professor',
  department TEXT DEFAULT 'Computer Science & Engineering',
  email TEXT,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. Faculty Allocations (Course + Section + Component + Teacher)
CREATE TABLE IF NOT EXISTS faculty_allocations (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  sub_section TEXT,
  component TEXT NOT NULL CHECK(component IN ('L', 'T', 'P', 'S')),
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_fac_section_comp UNIQUE(course_code, section_id, component, sub_section, faculty_id)
);

-- 10. Students Master Table (1,159 Roster Records)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,           -- '2300030001'
  name TEXT NOT NULL,
  university_email TEXT UNIQUE NOT NULL,
  personal_email TEXT,
  mobile_number TEXT,
  gender TEXT DEFAULT 'Male',
  date_of_birth TEXT NOT NULL DEFAULT '2005-04-18',
  aadhaar_number TEXT,
  apaar_number TEXT,
  residency_status TEXT DEFAULT 'Hosteler',
  parent_name TEXT,
  parent_phone_number TEXT,
  program TEXT DEFAULT 'CSE',
  flexibility_track TEXT DEFAULT 'CSE-2',
  addon_status_raw TEXT,                     -- Raw institutional value from Student Data.xlsx (e.g. 'Specialization', 'Minor', 'Second Major', 'No Add-on', 'NULL', NULL)
  addon_status TEXT DEFAULT 'Specialization', -- Reconciled academic classification ('Specialization', 'Minor', 'Second Major', 'No Add-on')
  addon_verification TEXT DEFAULT 'VERIFIED', -- 'VERIFIED', 'RECONCILED_SPECIALIZATION', 'UNRESOLVED'
  specialization TEXT,                       -- e.g. 'Data Engineering for AI', 'CLOUD NATIVE SOFTWARE ENGINEERING'
  cluster_id TEXT REFERENCES clusters(id) DEFAULT 'Cluster-1',
  student_type TEXT DEFAULT 'CRT',           -- 'CRT', 'NonCRT', 'NonCRT-PS', etc.
  placement_status TEXT DEFAULT 'Placed',    -- 'Placed', 'YTB Placed', etc.
  counselor_name TEXT DEFAULT 'Dr. S. Srinivasa Rao',
  counselor_id TEXT DEFAULT 'KLEF0864',
  counselor_mobile TEXT,
  counselor_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. Student Assigned Academic Buckets (Authoritative Cohort Matrix from Data One.xlsx)
CREATE TABLE IF NOT EXISTS student_assigned_buckets (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES buckets(id) ON DELETE RESTRICT,
  default_course_code TEXT,
  default_course_desc TEXT,
  lec_section TEXT,
  prac_section TEXT,
  skill_section TEXT,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_assigned_bucket_course UNIQUE(student_id, bucket_id, default_course_code, term_id)
);

-- 12. Student Subject Selections (Student Portal Choices)
CREATE TABLE IF NOT EXISTS student_subject_selections (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES buckets(id) ON DELETE RESTRICT,
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE RESTRICT,
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_bucket_term UNIQUE(student_id, bucket_id, term_id)
);

-- 13. Student Faculty Preferences
CREATE TABLE IF NOT EXISTS student_faculty_preferences (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_pref_key_term UNIQUE(student_id, preference_key, term_id)
);

-- 14. Student Section Selections (Selected Parallel Section and Component Choice)
CREATE TABLE IF NOT EXISTS student_section_selections (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL REFERENCES buckets(id) ON DELETE RESTRICT,
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE RESTRICT,
  selected_section TEXT NOT NULL,
  component TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'STUDENT_SELECTION_SUBMITTED',
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_course_comp_section UNIQUE(student_id, course_code, component, term_id)
);

-- 15. Student Preference Finalization State
CREATE TABLE IF NOT EXISTS student_preference_finalizations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'FINALIZED', -- 'FINALIZED', 'EDITABLE', 'REOPENED'
  finalized_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reopened_at TEXT,
  term_id TEXT REFERENCES academic_terms(id) DEFAULT '2026-27-EVEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 16. Administrators & Institutional Security Credentials
CREATE TABLE IF NOT EXISTS administrators (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,             -- e.g. '8897337687'
  password_hash TEXT NOT NULL,               -- Stored credential
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast operations
CREATE INDEX IF NOT EXISTS idx_courses_bucket ON courses(bucket_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_code);
CREATE INDEX IF NOT EXISTS idx_alloc_course ON faculty_allocations(course_code);
CREATE INDEX IF NOT EXISTS idx_alloc_faculty ON faculty_allocations(faculty_id);
CREATE INDEX IF NOT EXISTS idx_alloc_section ON faculty_allocations(section_id);
CREATE INDEX IF NOT EXISTS idx_students_cluster ON students(cluster_id);
CREATE INDEX IF NOT EXISTS idx_students_spec ON students(specialization);
CREATE INDEX IF NOT EXISTS idx_students_type ON students(student_type);
CREATE INDEX IF NOT EXISTS idx_students_placement ON students(placement_status);
CREATE INDEX IF NOT EXISTS idx_stu_assigned_b ON student_assigned_buckets(student_id, bucket_id);
CREATE INDEX IF NOT EXISTS idx_sub_sel_student ON student_subject_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_fac_pref_student ON student_faculty_preferences(student_id);
