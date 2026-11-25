-- Audit Logs Table for Administrator Modifications and Institutional Provenance Tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,       -- 'STUDENT', 'REGISTRATION', 'ALLOCATION', 'EXCEPTION'
  entity_id TEXT NOT NULL,         -- e.g. student_id, course_code, allocation_id
  action TEXT NOT NULL,            -- 'UPDATE', 'CORRECTION', 'STATUS_CHANGE', 'OVERRIDE'
  original_value TEXT,             -- JSON or text of prior state
  new_value TEXT,                  -- JSON or text of new state
  reason TEXT NOT NULL,            -- Academic or administrative justification
  source_reference TEXT,           -- Spreadsheet name, cell/row ref, or regulatory order
  admin_identity TEXT NOT NULL,    -- Admin user ID / username who executed mutation
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(created_at);
