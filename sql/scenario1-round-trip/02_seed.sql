INSERT INTO accounts VALUES
 ('A100','Asha'),('B200','Bilal'),('C300','Chen'),('D400','Divya'),('E500','Erik'),('F600','Farah');

-- Each block is a deliberate test case; expected outcome in the comment.
INSERT INTO transactions (txn_id, from_account, to_account, amount, txn_time) VALUES
 -- TC1 MATCH: exact amount back after 2h
 (1 ,'A100','B200', 10000.00,'2024-05-01 09:00:00'),
 (2 ,'B200','A100', 10000.00,'2024-05-01 11:00:00'),
 -- TC2 MATCH: 9% lower back after 20h (within 10%)
 (3 ,'C300','D400', 50000.00,'2024-05-02 08:00:00'),
 (4 ,'D400','C300', 45500.00,'2024-05-03 04:00:00'),
 -- TC3 MATCH (boundary): exactly 10% higher, exactly 24h later
 (5 ,'E500','F600', 20000.00,'2024-05-04 10:00:00'),
 (6 ,'F600','E500', 22000.00,'2024-05-05 10:00:00'),
 -- TC4 NO MATCH: amount 15% lower
 (7 ,'A100','C300', 8000.00 ,'2024-05-06 12:00:00'),
 (8 ,'C300','A100', 6800.00 ,'2024-05-06 13:00:00'),
 -- TC5 NO MATCH: return 24h + 1 minute later
 (9 ,'B200','D400', 3000.00 ,'2024-05-07 09:00:00'),
 (10,'D400','B200', 3000.00 ,'2024-05-08 09:01:00'),
 -- TC6 NO MATCH: same direction twice (not a reversal)
 (11,'E500','A100', 5000.00 ,'2024-05-09 09:00:00'),
 (12,'E500','A100', 5000.00 ,'2024-05-09 10:00:00'),
 -- TC7 NO MATCH: money moves on to a THIRD account, not back to the sender
 -- (an earlier "return before original" case was removed: any A->B / B->A pair inside 24h IS a
 --  round trip with the earlier txn as the original, which the automated check caught.)
 (13,'F600','B200', 7000.00 ,'2024-05-10 08:00:00'),
 (14,'B200','D400', 7000.00 ,'2024-05-10 09:00:00'),
 -- TC8 MATCH: crosses midnight / month end, 5% higher after 3h
 (15,'D400','E500', 12000.00,'2024-05-31 22:30:00'),
 (16,'E500','D400', 12600.00,'2024-06-01 01:30:00'),
 -- TC9 two candidate returns within window -> both reported (analyst decides)
 (17,'A100','F600', 40000.00,'2024-06-02 09:00:00'),
 (18,'F600','A100', 39000.00,'2024-06-02 15:00:00'),
 (19,'F600','A100', 41000.00,'2024-06-03 08:00:00'),
 -- noise
 (20,'C300','B200', 1500.00 ,'2024-06-04 09:00:00');
