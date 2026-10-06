-- Round-trip transfers: A -> B followed by B -> A for an amount within ±10% of the original,
-- where the return happens AFTER the original and no more than 24 hours later (inclusive).
SELECT
  o.txn_id                                   AS original_txn,
  r.txn_id                                   AS return_txn,
  o.from_account                             AS account_a,
  o.to_account                               AS account_b,
  o.amount                                   AS amount_sent,
  r.amount                                   AS amount_returned,
  ROUND(100.0 * (r.amount - o.amount) / o.amount, 2)            AS pct_difference,
  o.txn_time                                 AS sent_at,
  r.txn_time                                 AS returned_at,
  ROUND((julianday(r.txn_time) - julianday(o.txn_time)) * 24, 2) AS hours_apart
FROM transactions AS o
JOIN transactions AS r
  ON  r.from_account = o.to_account                     -- money comes back ...
  AND r.to_account   = o.from_account                   -- ... to the original sender
  AND r.txn_time     >  o.txn_time                      -- strictly after the original
  AND r.txn_time     <= datetime(o.txn_time, '+24 hours')
  AND ABS(r.amount - o.amount) <= 0.10 * o.amount       -- within 10% of the original amount
ORDER BY o.txn_time, r.txn_time;

-- PostgreSQL equivalent of the time/percent conditions:
--   AND r.txn_time >  o.txn_time
--   AND r.txn_time <= o.txn_time + INTERVAL '24 hours'
--   EXTRACT(EPOCH FROM r.txn_time - o.txn_time) / 3600 AS hours_apart
