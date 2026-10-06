-- Players with 30+ runs in at least 3 consecutive matches (IPL 2024), with the streak start date.
-- "Consecutive" = consecutive matches the player appeared in for 2024. A score below 30 or
-- "did not bat" (runs IS NULL) breaks the streak. Technique: gaps-and-islands with ROW_NUMBER().
WITH appearances AS (
  SELECT  p.player_id,
          p.player_name,
          m.match_date,
          m.match_id,
          b.runs,
          ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date, m.match_id) AS appearance_no
  FROM    batting_scores b
  JOIN    matches m ON m.match_id  = b.match_id
  JOIN    players p ON p.player_id = b.player_id
  WHERE   m.season = 2024
),
qualifying AS (
  -- Within an unbroken run of 30+ scores, appearance_no and the qualifying row number increase
  -- together, so their difference is constant -> it identifies the streak ("island").
  SELECT  *,
          appearance_no - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY match_date, match_id) AS streak_key
  FROM    appearances
  WHERE   runs >= 30
)
SELECT  player_name,
        MIN(match_date) AS streak_start_date,
        MAX(match_date) AS streak_end_date,
        COUNT(*)        AS matches_in_streak,
        GROUP_CONCAT(runs, ', ') AS scores
FROM    qualifying
GROUP BY player_id, player_name, streak_key
HAVING  COUNT(*) >= 3
ORDER BY streak_start_date, player_name;
-- PostgreSQL: replace GROUP_CONCAT(runs, ', ') with STRING_AGG(runs::text, ', ' ORDER BY match_date)
