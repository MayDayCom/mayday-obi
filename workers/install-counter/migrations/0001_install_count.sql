CREATE TABLE IF NOT EXISTS install_count (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  count INTEGER NOT NULL DEFAULT 0,
  since TEXT
);

INSERT INTO install_count (id) VALUES (1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS install_events (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('factory', 'update'))
);

CREATE TRIGGER IF NOT EXISTS count_install AFTER INSERT ON install_events
BEGIN
  UPDATE install_count
  SET count = count + 1,
      since = COALESCE(since, strftime('%Y-%m-%d', 'now', '+9 hours'))
  WHERE id = 1;
END;
