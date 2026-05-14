-- Management Terminal seed.
-- Seeds 43 user accounts, 3 default teams, and team membership matching the
-- current LBC research org. Default password for any user is <username>1234,
-- bcrypt-hashed via pgcrypto's crypt() + gen_salt('bf', 10). Users should
-- change their passwords on first login (account-management UI ships later).
--
-- Idempotent: ON CONFLICT DO NOTHING preserves existing rows so re-running
-- the seed never overwrites a user that already exists (which would otherwise
-- rotate their password to the default).

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
-- can_create_research_project = TRUE for: all C-suite, advisors (read+comment
-- only so set FALSE), research directors/VDs, SPD, AMD (incl. AMD analysts
-- per slide), and M&D director Farhan. Everyone else can still create
-- 'general' projects (free-form work tracking with Google-Sheets-style ACL).

INSERT INTO management.users (username, password_hash, full_name, role, division, title, can_create_research_project) VALUES
  -- C-suite
  ('nabil',      crypt('nabil1234',      gen_salt('bf', 10)), 'Nabil Sachio Refat',     'management', 'Exec', 'Chief Executive Officer',     TRUE),
  ('khalif',     crypt('khalif1234',     gen_salt('bf', 10)), 'M. Khalif P. Karnova',   'management', 'Exec', 'Chief Research Officer',      TRUE),
  ('rattana',    crypt('rattana1234',    gen_salt('bf', 10)), 'Rattana A. Chaniago',    'management', 'Exec', 'Chief Financial Officer',     TRUE),
  ('charlie',    crypt('charlie1234',    gen_salt('bf', 10)), 'Charlie Verchius',       'management', 'Exec', 'Chief Investment Officer',    TRUE),
  ('rizky',      crypt('rizky1234',      gen_salt('bf', 10)), 'M. Rizky Narindra',      'management', 'Exec', 'Chief Technological Officer', TRUE),
  ('kayla',      crypt('kayla1234',      gen_salt('bf', 10)), 'Kayla Kwok',             'management', 'Exec', 'Chief Strategy Officer',      TRUE),

  -- Advisors (read + comment, no create / no approve)
  ('stefano',    crypt('stefano1234',    gen_salt('bf', 10)), 'Stefano Ryan Oliver Yap','advisor',   'Advisor', 'Research Advisor',         FALSE),
  ('fakih',      crypt('fakih1234',      gen_salt('bf', 10)), 'Fakih Habib Dzulfikar',  'advisor',   'Advisor', 'Investment Advisor',       FALSE),

  -- Research directors + VDs
  ('satya',      crypt('satya1234',      gen_salt('bf', 10)), 'Satya Damba Pramudita',  'management', 'ERD', 'Equity Research Director',   TRUE),
  ('dzaki',      crypt('dzaki1234',      gen_salt('bf', 10)), 'Ahmad Dzaki Sofyan',     'management', 'ERD', 'ERD Vice Director 1',        TRUE),
  ('marselinus', crypt('marselinus1234', gen_salt('bf', 10)), 'A. Marselinus S.D.',     'management', 'ERD', 'ERD Vice Director 2',        TRUE),
  ('amadeus',    crypt('amadeus1234',    gen_salt('bf', 10)), 'Amadeus B.H. Sianturi',  'management', 'MRD', 'Market Research Director',   TRUE),
  ('deo',        crypt('deo1234',        gen_salt('bf', 10)), 'Deo',                    'management', 'MRD', 'MRD Vice Director',          TRUE),
  ('aqila',      crypt('aqila1234',      gen_salt('bf', 10)), 'Aqila Muhammad Taqy',    'management', 'IRD', 'Industry Research Director', TRUE),
  ('bintang',    crypt('bintang1234',    gen_salt('bf', 10)), 'Bintang Bintara',        'management', 'IRD', 'IRD Vice Director',          TRUE),

  -- AMD (under CIO). Per slide, AMD gives projects; all AMD members can create.
  ('aurafa',     crypt('aurafa1234',     gen_salt('bf', 10)), 'M. Aurafa Muhidin',      'management', 'AMD', 'AMD Vice Director',          TRUE),
  ('jonathan',   crypt('jonathan1234',   gen_salt('bf', 10)), 'Jonathan',               'analyst',    'AMD', 'AMD Analyst',                TRUE),
  ('farren',     crypt('farren1234',     gen_salt('bf', 10)), 'Farren',                 'analyst',    'AMD', 'AMD Analyst',                TRUE),
  ('rafif',      crypt('rafif1234',      gen_salt('bf', 10)), 'Rafif',                  'analyst',    'AMD', 'AMD Analyst',                TRUE),

  -- SPD (people management arm; read everything + assign analysts)
  ('grace',      crypt('grace1234',      gen_salt('bf', 10)), 'Grace',                  'management', 'SPD', 'Strategy & Performance',     TRUE),
  ('faiq',       crypt('faiq1234',       gen_salt('bf', 10)), 'Faiq',                   'management', 'SPD', 'Strategy & Performance',     TRUE),
  ('nadine',     crypt('nadine1234',     gen_salt('bf', 10)), 'Nadine',                 'management', 'SPD', 'Strategy & Performance',     TRUE),

  -- M&D
  ('farhan',     crypt('farhan1234',     gen_salt('bf', 10)), 'Farhan Yudha Satria',    'management', 'MND', 'Marketing & Design Director', TRUE),
  ('dharma',     crypt('dharma1234',     gen_salt('bf', 10)), 'Dharma',                 'analyst',    'MND', 'M&D Analyst',                 FALSE),
  ('tristan',    crypt('tristan1234',    gen_salt('bf', 10)), 'Tristan',                'analyst',    'MND', 'M&D Analyst',                 FALSE),
  ('fayyaz',     crypt('fayyaz1234',     gen_salt('bf', 10)), 'Fayyaz',                 'analyst',    'MND', 'M&D Analyst',                 FALSE),

  -- ERD analysts (6)
  ('bulan',      crypt('bulan1234',      gen_salt('bf', 10)), 'Bulan',                  'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('james',      crypt('james1234',      gen_salt('bf', 10)), 'James',                  'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('fauzan',     crypt('fauzan1234',     gen_salt('bf', 10)), 'Fauzan',                 'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('sheila',     crypt('sheila1234',     gen_salt('bf', 10)), 'Sheila',                 'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('tio',        crypt('tio1234',        gen_salt('bf', 10)), 'Tio',                    'analyst', 'ERD', 'ERD Analyst', FALSE),
  ('phillip',    crypt('phillip1234',    gen_salt('bf', 10)), 'Phillip',                'analyst', 'ERD', 'ERD Analyst', FALSE),

  -- MRD analysts (6)
  ('resti',      crypt('resti1234',      gen_salt('bf', 10)), 'Resti',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('aldrian',    crypt('aldrian1234',    gen_salt('bf', 10)), 'Aldrian',                'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('samuel',     crypt('samuel1234',     gen_salt('bf', 10)), 'Samuel',                 'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('sella',      crypt('sella1234',      gen_salt('bf', 10)), 'Sella',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('ghani',      crypt('ghani1234',      gen_salt('bf', 10)), 'Ghani',                  'analyst', 'MRD', 'MRD Analyst', FALSE),
  ('bhadra',     crypt('bhadra1234',     gen_salt('bf', 10)), 'Bhadra',                 'analyst', 'MRD', 'MRD Analyst', FALSE),

  -- IRD analysts (6)
  ('tiangga',    crypt('tiangga1234',    gen_salt('bf', 10)), 'Tiangga',                'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('gede',       crypt('gede1234',       gen_salt('bf', 10)), 'Gede',                   'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('azka',       crypt('azka1234',       gen_salt('bf', 10)), 'Azka',                   'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('jevan',      crypt('jevan1234',      gen_salt('bf', 10)), 'Jevan',                  'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('rifqi',      crypt('rifqi1234',      gen_salt('bf', 10)), 'Rifqi',                  'analyst', 'IRD', 'IRD Analyst', FALSE),
  ('kenneth',    crypt('kenneth1234',    gen_salt('bf', 10)), 'Kenneth',                'analyst', 'IRD', 'IRD Analyst', FALSE)
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teams (current batch). Management can rename / add / archive later via UI.
-- ---------------------------------------------------------------------------
INSERT INTO management.teams (slug, name, description) VALUES
  ('team-1', 'Team 1', 'Current Project 1 crew (Fauzan/Tio ERD, Resti/Bhadra MRD, Gede/Tiangga IRD)'),
  ('team-2', 'Team 2', 'Current Project 2 crew (Phillip/Sheila ERD, Samuel/Sella MRD, Rifqi/Jevan IRD)'),
  ('team-3', 'Team 3', 'Current Project 3 crew (Bulan/James ERD, Aldrian/Ghani MRD, Kenneth/Azka IRD)')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Team membership (the 18 research analysts; each on exactly one team).
-- ---------------------------------------------------------------------------
INSERT INTO management.team_members (team_id, user_id)
SELECT t.id, u.id
FROM management.users u
JOIN management.teams t ON
       (t.slug = 'team-1' AND u.username IN ('fauzan','tio','resti','bhadra','gede','tiangga'))
    OR (t.slug = 'team-2' AND u.username IN ('phillip','sheila','samuel','sella','rifqi','jevan'))
    OR (t.slug = 'team-3' AND u.username IN ('bulan','james','aldrian','ghani','kenneth','azka'))
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage bucket for deliverable file uploads.
-- Private bucket; the management-files-upload Edge Function returns signed
-- URLs scoped to the requesting user. 50 MB per file is plenty for PDFs/PPTX.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('management-files', 'management-files', FALSE, 52428800)
ON CONFLICT (id) DO NOTHING;
