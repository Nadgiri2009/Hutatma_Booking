/*
  Venue data extracted from Hutatma Smruti Mandir Rate Card (Marathi PDF)
  Includes 12 venue/hall types with details, facilities, images, and rules.
  
  Data Source: 
  - Page 1-2: Hall types 1-5 (Hutatma Smruti Mandir for various events)
  - Page 2-3: Hall types 6-13 (Drama, Dance, Gallery, Open spaces, etc.)
  
  Pricing: Refundable deposit Rs.12000/- per hall (3-hour slots)
  Location: Hutatma Chowk, Solapur, MH 413001
*/

BEGIN TRANSACTION;

-- ============================================================================
-- VENUE 1: Hutatma Smruti Mandir Hall - Classes & Gatherings
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Classes & Gatherings',
   'For classes, colleges, and general gatherings. Includes raised stage with spotlights.',
   800,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   1);

DECLARE @VenueId1 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId1, 'Stage / Podium', 'Raised stage with spotlights', 1, 1),
  (@VenueId1, 'Seating Arrangement', 'Chairs and tables as per requirement', 1, 2),
  (@VenueId1, 'Sound System', 'PA system with microphones', 1, 3),
  (@VenueId1, 'Air Conditioning', 'Full AC coverage', 1, 4),
  (@VenueId1, 'Lighting', 'Professional stage lighting', 1, 5);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId1, 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80', 'Main Hall - Front View', 1, 1, 1),
  (@VenueId1, 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80', 'Stage View with Lighting', 0, 1, 2);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId1, 'Timings', 'Venue must be vacated by 11:00 PM', 1, 1),
  (@VenueId1, 'No Smoking', 'Smoking is strictly prohibited inside the venue', 1, 2),
  (@VenueId1, 'Deposit Refund', 'Refundable deposit of Rs.12,000/- per 3-hour session', 1, 3),
  (@VenueId1, 'Weekend/Holiday', 'Extra charges apply on Saturdays, Sundays and Public Holidays', 1, 4);

-- ============================================================================
-- VENUE 2: Hutatma Smruti Mandir Hall - Government & Semi-Government
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Government Programs',
   'For government, semi-government, Z.P. schools and entertainment programs.',
   600,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   2);

DECLARE @VenueId2 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId2, 'Stage / Podium', 'Raised stage with spotlights', 1, 1),
  (@VenueId2, 'Sound System', 'PA system with microphones', 1, 2),
  (@VenueId2, 'Air Conditioning', 'Full AC coverage', 1, 3),
  (@VenueId2, 'High-Speed Internet', 'WiFi connectivity for presentations', 1, 4);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId2, 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=600&q=80', 'Government Hall Setup', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId2, 'Booking Duration', 'Minimum 3-hour session or full day booking', 1, 1),
  (@VenueId2, 'Parking', 'Limited parking available on-site', 1, 2),
  (@VenueId2, 'Catering', 'Outside catering permitted with management approval', 1, 3);

-- ============================================================================
-- VENUE 3: Hutatma Smruti Mandir Hall - Ceremonies & Conferences
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Ceremonies & Conferences',
   'Ideal for ceremonies, conferences and formal events.',
   500,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   3);

DECLARE @VenueId3 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId3, 'Stage / Podium', 'Premium stage with advanced spotlights', 1, 1),
  (@VenueId3, 'Projection System', 'HD Projectors and screens', 1, 2),
  (@VenueId3, 'Sound System', 'Professional PA system with wireless microphones', 1, 3),
  (@VenueId3, 'Reception Area', 'Dedicated reception and registration space', 1, 4),
  (@VenueId3, 'Catering Kitchen', 'In-house catering facilities', 1, 5);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId3, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', 'Conference Setup', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId3, 'Capacity', 'Maximum 500 guests in seated arrangement', 1, 1),
  (@VenueId3, 'Decoration', 'Professional decoration team available (additional cost)', 1, 2),
  (@VenueId3, 'Late Night Events', 'Late night events allowed with additional charges', 1, 3);

-- ============================================================================
-- VENUE 4: Hutatma Smruti Mandir Hall - Lecture Series
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Lecture Series',
   'Specialized setup for lectures, seminars and educational programs.',
   400,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   4);

DECLARE @VenueId4 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId4, 'Lecture Podium', 'Elevated podium for speaker', 1, 1),
  (@VenueId4, 'Seating Arrangement', 'Theater-style seating available', 1, 2),
  (@VenueId4, 'Sound & Projection', 'Full HD projection with sound system', 1, 3),
  (@VenueId4, 'Lighting Control', 'Advanced lighting control panel', 1, 4);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId4, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80', 'Lecture Hall Setup', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId4, 'Speaker Support', 'Technical support team available for presentations', 1, 1),
  (@VenueId4, 'Recording', 'Permission required for recording/broadcasting', 1, 2);

-- ============================================================================
-- VENUE 5: Hutatma Smruti Mandir Hall - Orchestra & Entertainment
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Orchestra & Entertainment',
   'Perfect for orchestra, gazal, singing and entertainment programs.',
   600,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   5);

DECLARE @VenueId5 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId5, 'Stage / Performance Area', 'Large stage for orchestra and performances', 1, 1),
  (@VenueId5, 'Professional Sound System', 'Concert-grade sound equipment', 1, 2),
  (@VenueId5, 'Stage Lighting', 'Advanced lighting for performances', 1, 3),
  (@VenueId5, 'Musician Green Room', 'Dedicated preparation area for artists', 1, 4),
  (@VenueId5, 'Acoustic Tuning', 'Professional acoustics optimized for music', 1, 5);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId5, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80', 'Performance Stage', 1, 1, 1),
  (@VenueId5, 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80', 'Concert Lighting', 0, 1, 2);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId5, 'Sound Check', 'Advance sound check recommended for best results', 1, 1),
  (@VenueId5, 'Equipment', 'In-house equipment available; outside equipment permitted with approval', 1, 2),
  (@VenueId5, 'Capacity Limitation', 'Maximum 600 standing or 400 seated audience', 1, 3);

-- ============================================================================
-- VENUE 6: Hutatma Smruti Mandir Hall - Dance Programs
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Dance Programs',
   'Ideal for Lavni, dance competitions, fashion shows and cultural events.',
   500,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   6);

DECLARE @VenueId6 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId6, 'Dance Floor', 'Sprung wooden dance floor', 1, 1),
  (@VenueId6, 'Stage', 'Full stage with professional setup', 1, 2),
  (@VenueId6, 'Sound System', 'High-quality audio system for dance music', 1, 3),
  (@VenueId6, 'Dressing Rooms', 'Multiple dressing rooms for artists', 1, 4),
  (@VenueId6, 'Stage Lighting', 'Colored lighting for dance performances', 1, 5);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId6, 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80', 'Dance Floor Setup', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId6, 'Floor Protection', 'Dance floor must be protected; dancing shoes mandatory', 1, 1),
  (@VenueId6, 'Rehearsal', 'Rehearsal sessions can be scheduled in advance', 1, 2);

-- ============================================================================
-- VENUE 7: Hutatma Smruti Mandir Hall - Drama & Magic
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Drama & Magic',
   'Theater setup for drama, magic and theatrical performances.',
   450,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   7);

DECLARE @VenueId7 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId7, 'Theater Stage', 'Full theater stage with curtains', 1, 1),
  (@VenueId7, 'Backstage Area', 'Large backstage for scene changes', 1, 2),
  (@VenueId7, 'Sound & Lights', 'Professional theater lighting and sound', 1, 3),
  (@VenueId7, 'Dressing Rooms', 'Multiple dressing rooms', 1, 4);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId7, 'https://images.unsplash.com/photo-1493514789a59-40635f77afca?w=600&q=80', 'Theater Stage', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId7, 'Stage Safety', 'All props and stage setup must be structurally safe', 1, 1),
  (@VenueId7, 'Lighting Rehearsal', 'Lighting rehearsal recommended before performance', 1, 2);

-- ============================================================================
-- VENUE 8: Hutatma Smruti Mandir Hall - Scripted Children Drama
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Children Drama',
   'Specialized venue for scripted children drama (Balnata, Nakala performances).',
   300,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   8);

DECLARE @VenueId8 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId8, 'Low Stage', 'Stage designed for children performances', 1, 1),
  (@VenueId8, 'Soft Lighting', 'Child-friendly lighting', 1, 2),
  (@VenueId8, 'Safety Rails', 'Safety railings around stage', 1, 3);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId8, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80', 'Children Performance Space', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId8, 'Supervision', 'Adult supervision required at all times', 1, 1),
  (@VenueId8, 'Safety First', 'All stage activities must prioritize child safety', 1, 2);

-- ============================================================================
-- VENUE 9: Hutatma Smruti Mandir Hall - Rehearsal Only Stage
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir Hall - Rehearsal Stage',
   'Dedicated stage for rehearsals and practice sessions only.',
   200,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   9);

DECLARE @VenueId9 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId9, 'Rehearsal Stage', 'Practice stage with basic setup', 1, 1),
  (@VenueId9, 'Sound System', 'Basic sound system for practice', 1, 2),
  (@VenueId9, 'Mirrors', 'Practice mirrors for dancers', 1, 3);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId9, 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&q=80', 'Rehearsal Space', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId9, 'Rehearsal Only', 'For rehearsals and practice sessions only; public performances not allowed', 1, 1),
  (@VenueId9, 'No Recording', 'Professional recording/streaming not permitted', 1, 2);

-- ============================================================================
-- VENUE 10: Shubhrai Art Gallery
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Shubhrai Art Gallery',
   'Gallery space for art exhibitions and cultural displays.',
   150,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   10);

DECLARE @VenueId10 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId10, 'Display Walls', 'Gallery walls for artwork display', 1, 1),
  (@VenueId10, 'Lighting', 'Gallery lighting to highlight artworks', 1, 2),
  (@VenueId10, 'Climate Control', 'Temperature and humidity controlled', 1, 3);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId10, 'https://images.unsplash.com/photo-1561214115-6d2f1b0609fa?w=600&q=80', 'Gallery Space', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId10, 'Art Protection', 'All artworks must be properly insured and protected', 1, 1),
  (@VenueId10, 'Lighting Bill', 'Electricity charges as per actual usage (light bills will be issued separately)', 1, 2);

-- ============================================================================
-- VENUE 11: Open Space - V.I.P Room Front
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir - Open Space (V.I.P Room Front)',
   'Open area in front of V.I.P room (50x50 feet). Light bills charged as per actual usage.',
   200,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   11);

DECLARE @VenueId11 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId11, 'Open Space', '50x50 feet outdoor space', 1, 1),
  (@VenueId11, 'Electricity Points', 'Multiple electrical outlets available', 1, 2);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId11, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80', 'Open Space Setup', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId11, 'Electricity Charges', 'Light bill charged as per actual usage - separate bill will be issued', 1, 1),
  (@VenueId11, 'Weather Dependent', 'Outdoor space subject to weather conditions', 1, 2);

-- ============================================================================
-- VENUE 12: Open Space - Parking/Exhibition Area
-- ============================================================================
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES
  ('Hutatma Smruti Mandir - Parking & Exhibition Space',
   'Open area near parking for exhibitions and stalls (25x50 feet). Electricity per actual usage.',
   250,
   'Hutatma Chowk, Solapur, MH 413001',
   'Active',
   12);

DECLARE @VenueId12 INT = SCOPE_IDENTITY();

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, IsActive, DisplayOrder)
VALUES
  (@VenueId12, 'Open Exhibition Space', '25x50 feet area for exhibitions and stalls', 1, 1),
  (@VenueId12, 'Parking Proximity', 'Adjacent to parking area for easy access', 1, 2),
  (@VenueId12, 'Electricity Supply', 'Electrical connections available for stalls', 1, 3);

INSERT INTO dbo.VenueImages (VenueId, ImageUrl, Caption, IsPrimary, IsActive, DisplayOrder)
VALUES
  (@VenueId12, 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=600&q=80', 'Exhibition & Parking Space', 1, 1, 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, IsActive, DisplayOrder)
VALUES
  (@VenueId12, 'Electricity Charges', 'Light bill charged as per actual usage - separate bill will be issued', 1, 1),
  (@VenueId12, 'Temporary Setup', 'Suitable for temporary setups and exhibitions', 1, 2),
  (@VenueId12, 'Cleanup', 'Area must be cleaned after event completion', 1, 3);

COMMIT TRANSACTION;

PRINT 'All 12 Hutatma Smruti Mandir venues inserted successfully with facilities, images and rules.';
