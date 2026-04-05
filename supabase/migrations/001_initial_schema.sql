-- CyberQuest Database Schema
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE, -- Join code for students (e.g., "DFIR101")
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{
        "allow_late_join": true,
        "show_leaderboard": true,
        "max_students": 50
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_code ON courses(code);

-- ============================================
-- COURSE ENROLLMENTS
-- ============================================
CREATE TABLE course_enrollments (
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (course_id, student_id)
);

CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);

-- ============================================
-- QUESTION BANKS
-- ============================================
CREATE TABLE question_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('dfir', 'malware', 'forensics', 'network', 'general')),
    is_public BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_banks_owner ON question_banks(owner_id);
CREATE INDEX idx_question_banks_course ON question_banks(course_id);

-- ============================================
-- QUESTIONS
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'terminal_command')),

    -- Question content
    content JSONB NOT NULL, -- { "text": "...", "scenario": "...", "instruction": "..." }
    options JSONB, -- For MC: [{"id": "a", "text": "Option A"}, ...]

    -- Correct answer(s)
    -- For MC: "a" or ["a", "b"] for multiple correct
    -- For TF: true/false
    -- For terminal: ["Get-Process", "tasklist", "ps"] (array of valid commands)
    correct_answer JSONB NOT NULL,

    -- Additional settings
    explanation TEXT, -- Shown after answering
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    points INTEGER DEFAULT 10,
    time_limit_seconds INTEGER DEFAULT 30,
    case_sensitive BOOLEAN DEFAULT false, -- For terminal commands
    tags TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_bank ON questions(bank_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- ============================================
-- GAME SESSIONS
-- ============================================
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES profiles(id),
    course_id UUID REFERENCES courses(id),
    question_bank_id UUID REFERENCES question_banks(id),

    title TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL, -- 6-character code (e.g., "ABC123")

    status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'starting', 'active', 'paused', 'finished')),
    game_mode TEXT DEFAULT 'race' CHECK (game_mode IN ('race', 'practice')),
    current_question_index INTEGER DEFAULT 0,

    settings JSONB DEFAULT '{
        "max_players": 15,
        "question_count": 10,
        "time_per_question": 30,
        "show_answers_after": true,
        "randomize_questions": true,
        "randomize_options": true,
        "allow_late_join": false,
        "streak_bonus_enabled": true,
        "time_bonus_enabled": true
    }',

    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_host ON game_sessions(host_id);
CREATE INDEX idx_game_sessions_code ON game_sessions(join_code);
CREATE INDEX idx_game_sessions_status ON game_sessions(status) WHERE status IN ('lobby', 'active');

-- ============================================
-- GAME QUESTIONS (questions loaded into a session)
-- ============================================
CREATE TABLE game_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    question_order INTEGER NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    UNIQUE(session_id, question_order)
);

CREATE INDEX idx_game_questions_session ON game_questions(session_id);

-- ============================================
-- GAME PLAYERS
-- ============================================
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),

    nickname TEXT NOT NULL,
    avatar_seed TEXT, -- For generating consistent random avatars

    -- Scoring
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_answers INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,

    -- Position in game world (for sync)
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    position_z FLOAT DEFAULT 0,
    rotation_y FLOAT DEFAULT 0,

    -- Connection state
    is_connected BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_game_players_session ON game_players(session_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);

-- ============================================
-- ANSWER SUBMISSIONS
-- ============================================
CREATE TABLE answer_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    game_question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,

    -- Answer data
    answer JSONB NOT NULL, -- The answer given
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER NOT NULL, -- Response time

    -- Points breakdown
    base_points INTEGER NOT NULL,
    time_bonus INTEGER DEFAULT 0,
    streak_bonus INTEGER DEFAULT 0,
    total_points INTEGER NOT NULL,

    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate submissions
    UNIQUE(game_question_id, player_id)
);

CREATE INDEX idx_submissions_session ON answer_submissions(session_id);
CREATE INDEX idx_submissions_player ON answer_submissions(player_id);

-- ============================================
-- PLAYER STATS (aggregated lifetime stats)
-- ============================================
CREATE TABLE player_stats (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    average_time_ms INTEGER DEFAULT 0,

    -- Category-specific stats
    dfir_correct INTEGER DEFAULT 0,
    malware_correct INTEGER DEFAULT 0,
    forensics_correct INTEGER DEFAULT 0,
    network_correct INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji or icon name
    category TEXT CHECK (category IN ('games', 'streaks', 'accuracy', 'speed', 'social', 'special')),
    requirement JSONB NOT NULL, -- {"type": "games_played", "threshold": 10}
    xp_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Courses: Instructors manage, students can view enrolled
CREATE POLICY "Instructors can manage their courses"
    ON courses FOR ALL TO authenticated
    USING (instructor_id = auth.uid());

CREATE POLICY "Students can view courses they're enrolled in"
    ON courses FOR SELECT TO authenticated
    USING (
        id IN (SELECT course_id FROM course_enrollments WHERE student_id = auth.uid())
        OR is_active = true
    );

-- Course Enrollments
CREATE POLICY "Users can view own enrollments"
    ON course_enrollments FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR course_id IN (
        SELECT id FROM courses WHERE instructor_id = auth.uid()
    ));

CREATE POLICY "Students can enroll themselves"
    ON course_enrollments FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

-- Question Banks: Owner manages, enrolled students can view
CREATE POLICY "Owners can manage question banks"
    ON question_banks FOR ALL TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Public banks are viewable"
    ON question_banks FOR SELECT TO authenticated
    USING (is_public = true);

-- Questions: Follow bank permissions
CREATE POLICY "Questions follow bank permissions"
    ON questions FOR SELECT TO authenticated
    USING (
        bank_id IN (
            SELECT id FROM question_banks
            WHERE owner_id = auth.uid() OR is_public = true
        )
    );

CREATE POLICY "Owners can manage questions"
    ON questions FOR ALL TO authenticated
    USING (
        bank_id IN (SELECT id FROM question_banks WHERE owner_id = auth.uid())
    );

-- Game Sessions: Host manages, players can view
CREATE POLICY "Host can manage game session"
    ON game_sessions FOR ALL TO authenticated
    USING (host_id = auth.uid());

CREATE POLICY "Players can view sessions they're in"
    ON game_sessions FOR SELECT TO authenticated
    USING (
        id IN (SELECT session_id FROM game_players WHERE user_id = auth.uid())
    );

-- Game Questions: Visible to session participants
CREATE POLICY "Game questions visible to participants"
    ON game_questions FOR SELECT TO authenticated
    USING (
        session_id IN (
            SELECT session_id FROM game_players WHERE user_id = auth.uid()
            UNION
            SELECT id FROM game_sessions WHERE host_id = auth.uid()
        )
    );

-- Game Players: Visible to players in same session
CREATE POLICY "Players visible to session participants"
    ON game_players FOR SELECT TO authenticated
    USING (
        session_id IN (SELECT session_id FROM game_players WHERE user_id = auth.uid())
        OR session_id IN (SELECT id FROM game_sessions WHERE host_id = auth.uid())
    );

CREATE POLICY "Users can join games"
    ON game_players FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own player record"
    ON game_players FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Answer Submissions
CREATE POLICY "Players can submit answers"
    ON answer_submissions FOR INSERT TO authenticated
    WITH CHECK (
        player_id IN (SELECT id FROM game_players WHERE user_id = auth.uid())
    );

CREATE POLICY "Players can view own submissions"
    ON answer_submissions FOR SELECT TO authenticated
    USING (
        player_id IN (SELECT id FROM game_players WHERE user_id = auth.uid())
    );

CREATE POLICY "Host can view all submissions"
    ON answer_submissions FOR SELECT TO authenticated
    USING (
        session_id IN (SELECT id FROM game_sessions WHERE host_id = auth.uid())
    );

-- Player Stats
CREATE POLICY "Users can view own stats"
    ON player_stats FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own stats"
    ON player_stats FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Achievements: Public read
CREATE POLICY "Achievements are public"
    ON achievements FOR SELECT TO authenticated
    USING (is_active = true);

-- User Achievements
CREATE POLICY "User achievements viewable by user"
    ON user_achievements FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );

    -- Initialize player stats
    INSERT INTO player_stats (user_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Generate unique 6-character join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars (0,O,I,1)
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_question_banks_updated_at
    BEFORE UPDATE ON question_banks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
