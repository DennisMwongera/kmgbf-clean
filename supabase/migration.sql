-- ============================================================
-- KMGBF Capacity Needs Assessment Tool – Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────
CREATE TYPE institution_level AS ENUM ('National', 'Regional', 'Local', 'International');
CREATE TYPE institution_type  AS ENUM (
  'Government Ministry', 'Regulatory Agency', 'Research Institute',
  'NGO / Civil Society', 'International Organization', 'Private Sector',
  'Academic Institution', 'Protected Area Authority', 'Local Government', 'Other'
);
CREATE TYPE user_role         AS ENUM ('admin', 'institution_lead', 'contributor', 'viewer');
CREATE TYPE priority_level    AS ENUM ('Low', 'Med', 'High');
CREATE TYPE capacity_type     AS ENUM ('Policy', 'Institutional', 'Technical', 'Financial', 'Infrastructure', 'Knowledge', '');
CREATE TYPE assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'submitted', 'approved');
CREATE TYPE timeline_option   AS ENUM ('0–6 months', '6–12 months', '1–2 years', '2–5 years', 'Long-term', '');

-- ─── INSTITUTIONS ─────────────────────────────────────────────
-- Represents an organization participating in the CNA process.
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  type          institution_type,
  level         institution_level,
  mandate       TEXT,
  scope         TEXT,
  focal_name    TEXT,
  focal_title   TEXT,
  focal_email   TEXT,
  country       TEXT DEFAULT 'Madagascar',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USER PROFILES ───────────────────────────────────────────
-- Extends Supabase auth.users with role and institution link.
CREATE TABLE user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT,
  email          TEXT,
  role           user_role NOT NULL DEFAULT 'contributor',
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ASSESSMENTS ─────────────────────────────────────────────
-- One assessment per institution per year (can have multiple versions).
CREATE TABLE assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assess_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status          assessment_status NOT NULL DEFAULT 'draft',
  overall_score   NUMERIC(4,2),                -- cached, recomputed on save
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DIMENSION REQUIRED SCORES ───────────────────────────────
-- Stores the user-configured required/threshold scores per dimension.
CREATE TABLE assessment_required_scores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id    UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension        TEXT NOT NULL,   -- matches DIMENSIONS constant
  required_score   NUMERIC(3,1) NOT NULL DEFAULT 3,
  UNIQUE(assessment_id, dimension)
);

-- ─── CORE CAPACITY RESPONSES ─────────────────────────────────
-- One row per indicator (50 total) per assessment.
CREATE TABLE core_responses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_index    SMALLINT NOT NULL CHECK (question_index BETWEEN 0 AND 49),
  dimension         TEXT NOT NULL,
  question_text     TEXT NOT NULL,
  score             NUMERIC(3,1) CHECK (score BETWEEN 0 AND 5),
  evidence          TEXT,
  gap               TEXT,
  capacity_type     TEXT,   -- free text from enum: Policy/Institutional/Technical/Financial/Infrastructure/Knowledge
  priority          TEXT,   -- Low / Med / High
  suggested_support TEXT,
  UNIQUE(assessment_id, question_index)
);

-- ─── TARGET-SPECIFIC RESPONSES ───────────────────────────────
-- One row per (target, indicator_index) per assessment.
CREATE TABLE target_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  target_num      SMALLINT NOT NULL CHECK (target_num BETWEEN 1 AND 23),
  indicator_index SMALLINT NOT NULL,
  indicator_text  TEXT NOT NULL,
  score           NUMERIC(3,1) CHECK (score BETWEEN 0 AND 5),
  evidence        TEXT,
  gap_identified  TEXT,
  capacity_need   TEXT,
  UNIQUE(assessment_id, target_num, indicator_index)
);

-- ─── PRIORITIZATION ──────────────────────────────────────────
CREATE TABLE priority_rows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  capacity_gap    TEXT,
  dimension       TEXT,
  urgency         SMALLINT NOT NULL DEFAULT 3 CHECK (urgency BETWEEN 1 AND 5),
  impact          SMALLINT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  feasibility     SMALLINT NOT NULL DEFAULT 3 CHECK (feasibility BETWEEN 1 AND 5),
  priority_score  NUMERIC(5,2) GENERATED ALWAYS AS ((urgency::NUMERIC * impact * feasibility) / 5.0) STORED
);

-- ─── CAPACITY DEVELOPMENT PLAN ───────────────────────────────
CREATE TABLE cdp_rows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  capacity_gap    TEXT,
  action          TEXT,
  institution     TEXT,
  timeline        TEXT,
  budget_usd      TEXT,
  indicator       TEXT,
  collaboration   TEXT
);

-- ─── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,   -- 'created', 'updated', 'submitted', 'exported', etc.
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_institutions_updated_at  BEFORE UPDATE ON institutions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assessments_updated_at   BEFORE UPDATE ON assessments   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── AUTO-CREATE USER PROFILE ON SIGNUP ──────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'contributor')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── OVERALL SCORE CACHE TRIGGER ─────────────────────────────
CREATE OR REPLACE FUNCTION update_overall_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_avg NUMERIC(4,2);
BEGIN
  SELECT ROUND(AVG(score)::NUMERIC, 2) INTO v_avg
  FROM core_responses
  WHERE assessment_id = COALESCE(NEW.assessment_id, OLD.assessment_id)
    AND score IS NOT NULL;

  UPDATE assessments
  SET overall_score = v_avg, updated_at = NOW()
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_core_score_cache
  AFTER INSERT OR UPDATE OR DELETE ON core_responses
  FOR EACH ROW EXECUTE FUNCTION update_overall_score();

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_assessments_institution ON assessments(institution_id);
CREATE INDEX idx_assessments_status      ON assessments(status);
CREATE INDEX idx_core_responses_assess   ON core_responses(assessment_id);
CREATE INDEX idx_core_responses_dim      ON core_responses(assessment_id, dimension);
CREATE INDEX idx_target_responses_assess ON target_responses(assessment_id);
CREATE INDEX idx_target_responses_tnum   ON target_responses(assessment_id, target_num);
CREATE INDEX idx_priority_rows_assess    ON priority_rows(assessment_id);
CREATE INDEX idx_cdp_rows_assess         ON cdp_rows(assessment_id);
CREATE INDEX idx_user_profiles_inst      ON user_profiles(institution_id);
CREATE INDEX idx_audit_log_user          ON audit_log(user_id);
CREATE INDEX idx_audit_log_assessment    ON audit_log(assessment_id);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────
ALTER TABLE institutions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_required_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_responses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_responses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_rows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_rows                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- Helper: get current user's institution
CREATE OR REPLACE FUNCTION current_user_institution()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT institution_id FROM user_profiles WHERE id = auth.uid()
$$;

-- ── INSTITUTIONS ──
-- Admins see all; institution_leads/contributors see their own
CREATE POLICY "Admins see all institutions"
  ON institutions FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Users see own institution"
  ON institutions FOR SELECT
  USING (id = current_user_institution());

CREATE POLICY "Admins manage institutions"
  ON institutions FOR ALL
  USING (current_user_role() = 'admin');

CREATE POLICY "Institution leads update own"
  ON institutions FOR UPDATE
  USING (id = current_user_institution() AND current_user_role() IN ('institution_lead', 'admin'));

-- ── USER PROFILES ──
CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins read all profiles"
  ON user_profiles FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins manage all profiles"
  ON user_profiles FOR ALL
  USING (current_user_role() = 'admin');

-- ── ASSESSMENTS ──
CREATE POLICY "Admins see all assessments"
  ON assessments FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Institution members see own assessments"
  ON assessments FOR SELECT
  USING (institution_id = current_user_institution());

CREATE POLICY "Contributors can create assessments"
  ON assessments FOR INSERT
  WITH CHECK (
    institution_id = current_user_institution()
    AND current_user_role() IN ('admin', 'institution_lead', 'contributor')
  );

CREATE POLICY "Contributors can update own institution assessments"
  ON assessments FOR UPDATE
  USING (
    institution_id = current_user_institution()
    AND current_user_role() IN ('admin', 'institution_lead', 'contributor')
  );

CREATE POLICY "Admins delete assessments"
  ON assessments FOR DELETE
  USING (current_user_role() = 'admin');

-- ── ASSESSMENT SUB-TABLES (inherit institution scoping via assessment join) ──
-- Required scores
CREATE POLICY "Select required scores"
  ON assessment_required_scores FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

CREATE POLICY "Manage required scores"
  ON assessment_required_scores FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

-- Core responses
CREATE POLICY "Select core responses"
  ON core_responses FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

CREATE POLICY "Manage core responses"
  ON core_responses FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

-- Target responses
CREATE POLICY "Select target responses"
  ON target_responses FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

CREATE POLICY "Manage target responses"
  ON target_responses FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

-- Priority rows
CREATE POLICY "Select priority rows"
  ON priority_rows FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

CREATE POLICY "Manage priority rows"
  ON priority_rows FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

-- CDP rows
CREATE POLICY "Select cdp rows"
  ON cdp_rows FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

CREATE POLICY "Manage cdp rows"
  ON cdp_rows FOR ALL
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE institution_id = current_user_institution() OR current_user_role() = 'admin'
    )
  );

-- Audit log
CREATE POLICY "Admins see all audit logs"
  ON audit_log FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "Users see own audit logs"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── VIEWS ───────────────────────────────────────────────────

-- Dimension score summary view (used by dashboard and reports)
CREATE OR REPLACE VIEW v_dimension_scores AS
SELECT
  a.id                  AS assessment_id,
  a.institution_id,
  i.name                AS institution_name,
  cr.dimension,
  ROUND(AVG(cr.score)::NUMERIC, 2) AS avg_score,
  COUNT(cr.score)       AS scored_count,
  COUNT(*)              AS total_count,
  ars.required_score
FROM assessments a
JOIN institutions i ON i.id = a.institution_id
JOIN core_responses cr ON cr.assessment_id = a.id
LEFT JOIN assessment_required_scores ars
  ON ars.assessment_id = a.id AND ars.dimension = cr.dimension
WHERE cr.score IS NOT NULL
GROUP BY a.id, a.institution_id, i.name, cr.dimension, ars.required_score;

-- Target score summary view
CREATE OR REPLACE VIEW v_target_scores AS
SELECT
  a.id                  AS assessment_id,
  a.institution_id,
  i.name                AS institution_name,
  tr.target_num,
  ROUND(AVG(tr.score)::NUMERIC, 2) AS avg_score,
  COUNT(tr.score)       AS scored_count,
  COUNT(*)              AS total_count
FROM assessments a
JOIN institutions i ON i.id = a.institution_id
JOIN target_responses tr ON tr.assessment_id = a.id
WHERE tr.score IS NOT NULL
GROUP BY a.id, a.institution_id, i.name, tr.target_num;

-- Cross-institution comparison view (admin only)
CREATE OR REPLACE VIEW v_cross_institution_scores AS
SELECT
  i.id                  AS institution_id,
  i.name                AS institution_name,
  i.type                AS institution_type,
  i.level               AS institution_level,
  a.id                  AS assessment_id,
  a.assess_date,
  a.status,
  a.overall_score,
  cr.dimension,
  ROUND(AVG(cr.score)::NUMERIC, 2) AS dimension_score
FROM institutions i
JOIN assessments a ON a.institution_id = i.id
JOIN core_responses cr ON cr.assessment_id = a.id
WHERE cr.score IS NOT NULL
GROUP BY i.id, i.name, i.type, i.level, a.id, a.assess_date, a.status, a.overall_score, cr.dimension;

-- ─── SEED: Default dimension required scores helper function ──
CREATE OR REPLACE FUNCTION seed_required_scores(p_assessment_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO assessment_required_scores (assessment_id, dimension, required_score) VALUES
    (p_assessment_id, 'Policy and Legal Capacity',             4),
    (p_assessment_id, 'Institutional Capacity',                4),
    (p_assessment_id, 'Technical Capacity',                    3),
    (p_assessment_id, 'Financial Capacity',                    3),
    (p_assessment_id, 'Coordination and Governance',           4),
    (p_assessment_id, 'Knowledge and Information Management',  3),
    (p_assessment_id, 'Infrastructure and Equipment',          3),
    (p_assessment_id, 'Awareness and Capacity Development',    3)
  ON CONFLICT (assessment_id, dimension) DO NOTHING;
END;
$$;

-- ─── STORAGE BUCKET FOR EXPORTS ──────────────────────────────
-- Run this separately in Supabase Storage tab, or via the API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage RLS (if using Supabase Storage)
-- CREATE POLICY "Users can upload to own institution folder"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── GRANT PERMISSIONS ───────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
