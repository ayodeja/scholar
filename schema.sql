-- ============================================================================
-- SCHOLAR — production schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Every table with user data has Row Level Security enabled so a user can
-- only ever see their own rows — Postgres enforces this, not the app code.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- PROFILES — one row per auth user, created by a trigger on signup.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  subjects text[] default '{}',
  preparing_for text,             -- e.g. 'university_exams', 'professional_exams'
  learning_style text[] default '{}', -- e.g. ['reading','practice','flashcards']
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profiles: read own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- COURSES — a student's personal course groupings.
-- ---------------------------------------------------------------------------
create table courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
alter table courses enable row level security;
create policy "courses: owner all" on courses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- MATERIALS — uploaded files, tracked through the real processing pipeline.
-- ---------------------------------------------------------------------------
create type material_status as enum ('uploaded','extracting','analyzing','structuring','ready','failed');

create table materials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  file_path text not null,        -- path within the 'materials' storage bucket
  file_type text not null,        -- pdf | doc | txt | image | audio | video
  status material_status not null default 'uploaded',
  error_message text,
  extracted_text text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table materials enable row level security;
create policy "materials: owner all" on materials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- CONCEPTS — the atomic unit of knowledge. A lesson is generated once per
-- concept and reused, instead of re-calling Gemini on every visit.
-- ---------------------------------------------------------------------------
create table concepts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  material_id uuid references materials(id) on delete set null,
  title text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);
alter table concepts enable row level security;
create policy "concepts: owner all" on concepts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- LESSONS — one generated lesson body per concept.
-- ---------------------------------------------------------------------------
create table lessons (
  id uuid primary key default uuid_generate_v4(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  what_is_it text not null,
  simple_explanation text not null,
  academic_explanation text not null,
  exam_explanation text not null,
  key_elements text[] not null default '{}',
  why_matters text,
  source_status text,             -- 'supported' | 'conflicting' | 'needs_context' | null
  source_lecture text,
  source_external text,
  created_at timestamptz not null default now()
);
alter table lessons enable row level security;
create policy "lessons: owner all" on lessons for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RELATED_CONCEPTS — the knowledge graph edges (related / prerequisite / deeper).
-- ---------------------------------------------------------------------------
create type relation_kind as enum ('related','prerequisite','deeper');

create table related_concepts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  related_title text not null,    -- free-text label; resolved to a concept row lazily on click
  kind relation_kind not null default 'related'
);
alter table related_concepts enable row level security;
create policy "related_concepts: owner all" on related_concepts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- QUIZZES / QUESTIONS / ATTEMPTS
-- ---------------------------------------------------------------------------
create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table quizzes enable row level security;
create policy "quizzes: owner all" on quizzes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  type text not null,             -- mc | true_false | fill_blank | short | scenario | exam
  question text not null,
  options text[],
  correct_index int,
  model_answer text,
  explanation text
);
alter table questions enable row level security;
create policy "questions: owner via quiz" on questions for all
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()))
  with check (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = auth.uid()));

create table quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  was_correct boolean not null,
  student_answer text,
  answered_at timestamptz not null default now()
);
alter table quiz_attempts enable row level security;
create policy "quiz_attempts: owner all" on quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- FLASHCARDS + REVIEWS
-- ---------------------------------------------------------------------------
create table flashcards (
  id uuid primary key default uuid_generate_v4(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz not null default now()
);
alter table flashcards enable row level security;
create policy "flashcards: owner all" on flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table flashcard_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flashcard_id uuid not null references flashcards(id) on delete cascade,
  rating text not null,           -- 'knew' | 'struggled' | 'didnt_know'
  reviewed_at timestamptz not null default now()
);
alter table flashcard_reviews enable row level security;
create policy "flashcard_reviews: owner all" on flashcard_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- MASTERY — derived, evidence-based state per concept. Recomputed after
-- every quiz attempt / flashcard review / recall session, never random.
-- ---------------------------------------------------------------------------
create type mastery_state as enum ('new','learning','strong','mastered','at_risk');

create table mastery (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  state mastery_state not null default 'new',
  correct_streak int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  unique (user_id, concept_id)
);
alter table mastery enable row level security;
create policy "mastery: owner all" on mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STUDY SESSIONS + STREAKS — only meaningful activity is logged here;
-- the streak is derived from distinct calendar days with a session row,
-- so simply opening the app can never create one.
-- ---------------------------------------------------------------------------
create table study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,    -- lesson | quiz | flashcards | review | tutor | exam
  concept_id uuid references concepts(id) on delete set null,
  duration_seconds int,
  created_at timestamptz not null default now()
);
alter table study_sessions enable row level security;
create policy "study_sessions: owner all" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- TUTOR SESSIONS, EXAM ATTEMPTS, TEXTBOOKS, STUDY PACKS, BOOKMARKS, SOURCES
-- ---------------------------------------------------------------------------
create table tutor_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references concepts(id) on delete set null,
  transcript jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table tutor_sessions enable row level security;
create policy "tutor_sessions: owner all" on tutor_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table exam_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  question text not null,
  student_answer text not null,
  feedback jsonb,
  created_at timestamptz not null default now()
);
alter table exam_attempts enable row level security;
create policy "exam_attempts: owner all" on exam_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table textbooks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  author text,
  edition text,
  publisher text,
  identified_from_material_id uuid references materials(id) on delete set null,
  access_options jsonb,            -- [{label, url}], legitimate sources only
  created_at timestamptz not null default now()
);
alter table textbooks enable row level security;
create policy "textbooks: owner all" on textbooks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table study_packs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table study_packs enable row level security;
create policy "study_packs: owner all" on study_packs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table bookmarks enable row level security;
create policy "bookmarks: owner all" on bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table research_sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  summary text not null,
  fetched_at timestamptz not null default now()
);
alter table research_sources enable row level security;
create policy "research_sources: owner all" on research_sources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STORAGE — private bucket for uploaded materials.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
  on conflict (id) do nothing;

create policy "materials bucket: owner read"
  on storage.objects for select
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "materials bucket: owner write"
  on storage.objects for insert
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "materials bucket: owner delete"
  on storage.objects for delete
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

-- Upload paths should therefore look like: {user_id}/{material_id}/{filename}
