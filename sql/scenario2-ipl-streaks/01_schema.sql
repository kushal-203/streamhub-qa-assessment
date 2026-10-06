-- Scenario 2: IPL 2024 batting streaks (SQLite 3.25+ / PostgreSQL / MySQL 8 – window functions)
DROP TABLE IF EXISTS batting_scores;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  player_id   INTEGER PRIMARY KEY,
  player_name TEXT NOT NULL,
  team        TEXT NOT NULL
);

CREATE TABLE matches (
  match_id    INTEGER PRIMARY KEY,
  season      INTEGER NOT NULL,
  match_date  TEXT    NOT NULL,     -- 'YYYY-MM-DD'
  home_team   TEXT    NOT NULL,
  away_team   TEXT    NOT NULL
);

-- One row per player per match they were in the XI for. runs IS NULL = did not bat.
CREATE TABLE batting_scores (
  match_id   INTEGER NOT NULL REFERENCES matches(match_id),
  player_id  INTEGER NOT NULL REFERENCES players(player_id),
  runs       INTEGER CHECK (runs IS NULL OR runs >= 0),
  PRIMARY KEY (match_id, player_id)
);
