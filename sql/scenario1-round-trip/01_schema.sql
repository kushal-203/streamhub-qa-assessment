-- Scenario 1: round-trip transfers (SQLite 3.25+; portable to PostgreSQL/MySQL 8 with minor date-function changes)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
  account_id   TEXT PRIMARY KEY,
  holder_name  TEXT NOT NULL
);

CREATE TABLE transactions (
  txn_id        INTEGER PRIMARY KEY,
  from_account  TEXT    NOT NULL REFERENCES accounts(account_id),
  to_account    TEXT    NOT NULL REFERENCES accounts(account_id),
  amount        NUMERIC NOT NULL CHECK (amount > 0),
  txn_time      TEXT    NOT NULL,              -- ISO-8601 'YYYY-MM-DD HH:MM:SS' (UTC)
  CHECK (from_account <> to_account)
);

CREATE INDEX idx_txn_pair_time ON transactions (from_account, to_account, txn_time);
