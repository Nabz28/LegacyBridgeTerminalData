-- 0020 -- Mindmap: a per-project "thinking framework" for analysts.
--
-- A lightweight, collaborative node/edge canvas (think thesis-building /
-- mindmap). Each project has ONE shared mindmap; the grouping key is the
-- project_id (no parent "mindmap" table — keeps it uncluttered).
--
--   * mindmap_nodes : a card with a Title + Body, a canvas position (x,y),
--                     an optional colour, and a collapsed flag.
--   * mindmap_edges : a directed connection between two nodes.
--
-- Unlike notes/deliverables (writes go through a service_role edge
-- function), the mindmap is an internal analyst whiteboard: low-risk,
-- meant to be freely editable by any authenticated management user. So we
-- grant full CRUD to `authenticated` and let the client write directly via
-- PostgREST under RLS. RLS still requires a valid authenticated JWT.
--
-- Idempotent: every object uses IF NOT EXISTS / DROP-then-CREATE guards.

-- ---------- nodes ----------
CREATE TABLE IF NOT EXISTS management.mindmap_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Untitled',
    body        TEXT NOT NULL DEFAULT '',
    x           DOUBLE PRECISION NOT NULL DEFAULT 0,
    y           DOUBLE PRECISION NOT NULL DEFAULT 0,
    color       TEXT
                CHECK (color IS NULL OR color IN ('yellow','pink','blue','green','red','gray')),
    collapsed   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  UUID REFERENCES management.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_project
    ON management.mindmap_nodes (project_id);

-- ---------- edges ----------
CREATE TABLE IF NOT EXISTS management.mindmap_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      TEXT NOT NULL REFERENCES management.projects(id) ON DELETE CASCADE,
    source_node_id  UUID NOT NULL REFERENCES management.mindmap_nodes(id) ON DELETE CASCADE,
    target_node_id  UUID NOT NULL REFERENCES management.mindmap_nodes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT mindmap_edges_no_self CHECK (source_node_id <> target_node_id),
    CONSTRAINT mindmap_edges_unique  UNIQUE (source_node_id, target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_mindmap_edges_project
    ON management.mindmap_edges (project_id);

-- ---------- RLS + grants (full CRUD for authenticated) ----------
ALTER TABLE management.mindmap_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE management.mindmap_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mm_nodes_all ON management.mindmap_nodes;
CREATE POLICY mm_nodes_all
    ON management.mindmap_nodes
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mm_edges_all ON management.mindmap_edges;
CREATE POLICY mm_edges_all
    ON management.mindmap_edges
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON management.mindmap_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON management.mindmap_edges TO authenticated;
GRANT ALL ON management.mindmap_nodes TO service_role;
GRANT ALL ON management.mindmap_edges TO service_role;

-- updated_at trigger on nodes (re-uses the shared touch fn from bootstrap).
DROP TRIGGER IF EXISTS trg_mindmap_nodes_touch ON management.mindmap_nodes;
CREATE TRIGGER trg_mindmap_nodes_touch
    BEFORE UPDATE ON management.mindmap_nodes
    FOR EACH ROW EXECUTE FUNCTION management.touch_updated_at();

-- Realtime so edits propagate across open browsers.
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE management.mindmap_nodes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE management.mindmap_edges;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

NOTIFY pgrst, 'reload schema';
