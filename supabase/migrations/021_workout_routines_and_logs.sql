-- Migration 021: Workout Routines and Member Training Logs
-- Inspired by openGym (https://github.com/DuarteSantos8/openGym)
-- Adds personal training workout builders, routine assignments, and member set tracking.

CREATE TABLE IF NOT EXISTS workout_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    split_type TEXT NOT NULL DEFAULT 'PPL', -- 'PPL', 'Upper_Lower', 'Full_Body', '5x5', 'Custom'
    days_per_week INT NOT NULL DEFAULT 3,
    description TEXT,
    schedule JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of days with exercise prescriptions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_assigned_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES workout_routines(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES workout_routines(id) ON DELETE SET NULL,
    session_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INT DEFAULT 45,
    total_volume_kg NUMERIC(10, 2) DEFAULT 0,
    sets JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of completed sets [{exercise, weight, reps, rpe, is_pr}]
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast member query lookup and analytics
CREATE INDEX IF NOT EXISTS idx_workout_routines_gym ON workout_routines(gym_id);
CREATE INDEX IF NOT EXISTS idx_member_assigned_routines_member ON member_assigned_routines(member_id, active);
CREATE INDEX IF NOT EXISTS idx_workout_logs_member_date ON workout_logs(member_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_gym_date ON workout_logs(gym_id, date);

-- Enable Row Level Security
ALTER TABLE workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_assigned_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_routines
CREATE POLICY workout_routines_tenant_isolation ON workout_routines
    FOR ALL
    USING (gym_id = (auth.jwt() -> 'user_metadata' ->> 'gym_id')::UUID);

-- RLS Policies for member_assigned_routines
CREATE POLICY member_assigned_routines_tenant_isolation ON member_assigned_routines
    FOR ALL
    USING (gym_id = (auth.jwt() -> 'user_metadata' ->> 'gym_id')::UUID);

-- RLS Policies for workout_logs
CREATE POLICY workout_logs_tenant_isolation ON workout_logs
    FOR ALL
    USING (gym_id = (auth.jwt() -> 'user_metadata' ->> 'gym_id')::UUID);
