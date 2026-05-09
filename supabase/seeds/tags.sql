-- Seed: default tags for Streaks app
-- Run once on a fresh database: psql ... < supabase/seeds/tags.sql
-- Safe to re-run: ON CONFLICT DO NOTHING

INSERT INTO public.tags (name, color, category) VALUES
-- General
('Work',             '#3B82F6', 'general'),
('Personal',         '#22C55E', 'general'),
('Health',           '#EF4444', 'general'),
('Study',            '#EAB308', 'general'),
('Finance',          '#6366F1', 'general'),
('Home',             '#F59E0B', 'general'),
('Travel',           '#14B8A6', 'general'),
('Creativity',       '#EC4899', 'general'),
('Fun',              '#F07F13', 'general'),
('Self-care',        '#8B5CF6', 'general'),

-- Health
('Fitness',          '#F07F13', 'health'),
('Nutrition',        '#10B981', 'health'),
('Sleep',            '#8B5CF6', 'health'),
('Mindfulness',      '#06B6D4', 'health'),
('Hydration',        '#3B82F6', 'health'),
('Stretching',       '#22C55E', 'health'),
('Cardio',           '#EF4444', 'health'),
('Strength',         '#F59E0B', 'health'),
('Mental health',    '#EC4899', 'health'),
('Recovery',         '#14B8A6', 'health'),
('Posture',          '#6366F1', 'health'),
('Cold shower',      '#0EA5E9', 'health'),
('Breathwork',       '#A78BFA', 'health'),
('Fasting',          '#FB923C', 'health'),

-- Learning
('Reading',          '#F59E0B', 'learning'),
('Writing',          '#6366F1', 'learning'),
('Coding',           '#EC4899', 'learning'),
('Languages',        '#14B8A6', 'learning'),
('Mathematics',      '#3B82F6', 'learning'),
('Science',          '#10B981', 'learning'),
('History',          '#EAB308', 'learning'),
('Music',            '#F07F13', 'learning'),
('Art',              '#EF4444', 'learning'),
('Design',           '#8B5CF6', 'learning'),
('Photography',      '#06B6D4', 'learning'),
('Podcasts',         '#22C55E', 'learning'),
('Online course',    '#6366F1', 'learning'),
('Flashcards',       '#F59E0B', 'learning'),

-- Routine
('Morning routine',  '#F07F13', 'routine'),
('Evening routine',  '#8B5CF6', 'routine'),
('Journaling',       '#EAB308', 'routine'),
('Gratitude',        '#22C55E', 'routine'),
('Planning',         '#3B82F6', 'routine'),
('Review',           '#14B8A6', 'routine'),
('Declutter',        '#EF4444', 'routine'),
('Digital detox',    '#6366F1', 'routine'),
('Inbox zero',       '#F59E0B', 'routine'),
('Meal prep',        '#10B981', 'routine'),
('Skincare',         '#EC4899', 'routine'),

-- Social
('Family',           '#EF4444', 'social'),
('Friends',          '#22C55E', 'social'),
('Networking',       '#3B82F6', 'social'),
('Community',        '#F07F13', 'social'),
('Volunteering',     '#10B981', 'social'),
('Mentoring',        '#8B5CF6', 'social'),
('Dating',           '#EC4899', 'social'),

-- Work / career
('Deep work',        '#6366F1', 'work'),
('Meetings',         '#EAB308', 'work'),
('Email',            '#3B82F6', 'work'),
('Projects',         '#14B8A6', 'work'),
('Side hustle',      '#F07F13', 'work'),
('Job search',       '#EF4444', 'work'),
('Portfolio',        '#EC4899', 'work'),
('Public speaking',  '#F59E0B', 'work'),

-- Productivity
('Habits',           '#F07F13', 'productivity'),
('Goals',            '#22C55E', 'productivity'),
('Focus',            '#3B82F6', 'productivity'),
('Time blocking',    '#6366F1', 'productivity'),
('No-distraction',   '#EF4444', 'productivity'),
('Batch tasks',      '#14B8A6', 'productivity'),
('Two-minute rule',  '#EAB308', 'productivity'),

-- Mindset
('Discipline',       '#8B5CF6', 'mindset'),
('Confidence',       '#EC4899', 'mindset'),
('Patience',         '#10B981', 'mindset'),
('Resilience',       '#F07F13', 'mindset'),
('Positive thinking','#22C55E', 'mindset'),
('Stoicism',         '#6366F1', 'mindset'),
('Minimalism',       '#3B82F6', 'mindset'),
('Curiosity',        '#F59E0B', 'mindset'),

-- Sports / movement
('Walking',          '#22C55E', 'sport'),
('Running',          '#EF4444', 'sport'),
('Cycling',          '#3B82F6', 'sport'),
('Swimming',         '#06B6D4', 'sport'),
('Yoga',             '#8B5CF6', 'sport'),
('Pilates',          '#EC4899', 'sport'),
('HIIT',             '#F07F13', 'sport'),
('Martial arts',     '#EAB308', 'sport'),
('Team sport',       '#14B8A6', 'sport'),
('Climbing',         '#6366F1', 'sport'),
('Dance',            '#F59E0B', 'sport'),
('Hiking',           '#10B981', 'sport')
ON CONFLICT DO NOTHING;
