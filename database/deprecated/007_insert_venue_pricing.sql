/*
  VenuePricing insert script - Extracted from Hutatma Smruti Mandir PDF Rate Card
  
  All prices are per session (for halls) or per day (for open spaces/gallery)
  Refundable deposits: Rs.12,000/- per session for halls
  GST: 9% CGST + 9% SGST = 18% total
  
  Note: Extra charges apply for Saturday/Sunday/Public Holidays (Rs.1400 additional)
        Gallery and open spaces charged as per actual electricity usage
*/

BEGIN TRANSACTION;

-- VENUE 1: Hutatma Smruti Mandir Hall - Classes & Gatherings
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (1, 'Session (Weekday)', 'Session', 30000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (1, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 2: Hutatma Smruti Mandir Hall - Government Programs
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (2, 'Session (Weekday)', 'Session', 30000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (2, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 3: Hutatma Smruti Mandir Hall - Ceremonies & Conferences
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (3, 'Session (Weekday)', 'Session', 30000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (3, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 4: Hutatma Smruti Mandir Hall - Lecture Series
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (4, 'Session (Weekday)', 'Session', 7500.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (4, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 5: Hutatma Smruti Mandir Hall - Orchestra & Entertainment
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (5, 'Session (Weekday)', 'Session', 30000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (5, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 6: Hutatma Smruti Mandir Hall - Dance Programs (Lavni)
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (6, 'Session (Weekday)', 'Session', 15000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (6, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 7: Hutatma Smruti Mandir Hall - Drama & Magic
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (7, 'Session (Weekday)', 'Session', 2000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (7, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 8: Hutatma Smruti Mandir Hall - Scripted Children Drama
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (8, 'Session (Weekday)', 'Session', 3000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (8, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 9: Hutatma Smruti Mandir Hall - Rehearsal Only Stage
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (9, 'Session (Weekday)', 'Session', 3000.00, 12000.00, 9.00, 9.00, '2026-01-01', 1, 1),
  (9, 'Extra Charges (Sat/Sun/Holiday)', 'Session', 1400.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 2);

-- VENUE 10: Shubhrai Art Gallery (Per Day - Light bill charged separately)
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (10, 'Daily Rate', 'Day', 1000.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 1);

-- VENUE 11: Open Space - V.I.P Room Front (Per Day - Light bill charged separately)
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (11, 'Daily Rate (50x50 feet)', 'Day', 500.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 1);

-- VENUE 12: Open Space - Parking & Exhibition Area (Per Day - Light bill charged separately)
INSERT INTO dbo.VenuePricing (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, CGSTPercent, SGSTPercent, EffectiveFrom, IsActive, DisplayOrder)
VALUES
  (12, 'Daily Rate (25x50 feet)', 'Day', 500.00, 0.00, 9.00, 9.00, '2026-01-01', 1, 1);

COMMIT TRANSACTION;

PRINT 'VenuePricing data inserted for all 12 venues.';