CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('vocabulary', 'grammar', 'phrase')),
  term TEXT NOT NULL,
  reading TEXT,
  meanings TEXT NOT NULL, -- JSON array of strings
  part_of_speech TEXT,
  register TEXT, -- JSON array of strings
  attachment_rules TEXT, -- JSON object (grammar only)
  usage_context TEXT,
  examples TEXT, -- JSON array of {japanese, translation, source?}
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_term ON entries(term);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);

-- 全文検索 (searchFullText) queries these columns directly with LIKE (see db/queries/search.ts).
-- An FTS5 table used to sit here, but unicode61 doesn't segment Japanese (a run of
-- kana/kanji with no spaces becomes ONE token), so MATCH-based prefix search silently
-- missed substrings like 勉強 inside 猛勉強する. FTS5's trigram tokenizer would fix that
-- for MATCH, but MATCH queries need 3+ characters to form a trigram, so 2-character
-- queries (common for Japanese vocabulary) would still fail to match. Plain LIKE has
-- neither limitation — it does a real substring match regardless of tokenization — and
-- at this app's scale (a few hundred entries) a full scan per keystroke is trivial, so
-- LIKE is both simpler and more correct than FTS5 here.

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- unified type set (see src/config/connectionTypes.ts); may connect entries of different types
  user_label TEXT,
  ai_reasoning TEXT,
  confirmed_by_user INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_records (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK(format IN ('term_to_meaning', 'meaning_to_term', 'example_review')),
  correct INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_records_entry ON quiz_records(entry_id);
CREATE INDEX IF NOT EXISTS idx_quiz_records_session ON quiz_records(session_id);
