# PHASE 4: Dynamic PDF Data Import - Hutatma Smruti Mandir Venue Master Data

## Overview

This implementation converts static PDF venue/hall data into a dynamic, database-driven master data system. All 12 venue types from the Hutatma Smruti Mandir rate card have been structured into relational tables with proper relationships.

## Database Schema

### Master Tables Created

#### 1. **VenueMaster**
Stores primary venue/hall information.

| Column | Type | Constraints |
|--------|------|-------------|
| VenueId | INT | PK, IDENTITY(1,1) |
| VenueName | NVARCHAR(150) | NOT NULL, UNIQUE |
| Description | NVARCHAR(MAX) | NULL |
| Capacity | INT | NULL |
| Location | NVARCHAR(200) | NULL |
| Status | NVARCHAR(30) | DEFAULT 'Active' |
| DisplayOrder | INT | DEFAULT 0 |
| CreatedAt | DATETIME2 | DEFAULT SYSUTCDATETIME() |
| UpdatedAt | DATETIME2 | NULL |

#### 2. **VenueFacilities**
Lists amenities and facilities available at each venue.

| Column | Type | Constraints |
|--------|------|-------------|
| Id | INT | PK, IDENTITY(1,1) |
| VenueId | INT | FK → VenueMaster (Cascade) |
| FacilityName | NVARCHAR(150) | NOT NULL |
| Description | NVARCHAR(500) | NULL |
| IsActive | BIT | DEFAULT 1 |
| DisplayOrder | INT | DEFAULT 0 |

#### 3. **VenueImages**
Stores image references for venues.

| Column | Type | Constraints |
|--------|------|-------------|
| Id | INT | PK, IDENTITY(1,1) |
| VenueId | INT | FK → VenueMaster (Cascade) |
| ImageUrl | NVARCHAR(500) | NOT NULL |
| Caption | NVARCHAR(200) | NULL |
| IsPrimary | BIT | DEFAULT 0 |
| IsActive | BIT | DEFAULT 1 |
| DisplayOrder | INT | DEFAULT 0 |

#### 4. **VenueRules**
Capture rules, policies, and guidelines for each venue.

| Column | Type | Constraints |
|--------|------|-------------|
| Id | INT | PK, IDENTITY(1,1) |
| VenueId | INT | FK → VenueMaster (Cascade) |
| RuleTitle | NVARCHAR(200) | NOT NULL |
| RuleText | NVARCHAR(MAX) | NOT NULL |
| IsActive | BIT | DEFAULT 1 |
| DisplayOrder | INT | DEFAULT 0 |

#### 5. **VenuePricing**
Pricing details for each venue (already exists in the schema).

| Column | Type |
|--------|------|
| VenueId | INT (FK) |
| PriceItemName | NVARCHAR(150) |
| ChargeUnit | NVARCHAR(50) |
| Amount | DECIMAL(12,2) |
| RefundableDeposit | DECIMAL(12,2) |
| CGSTPercent | DECIMAL(5,2) |
| SGSTPercent | DECIMAL(5,2) |
| EffectiveFrom | DateOnly |
| EffectiveTo | DateOnly (NULL) |

## Data Imported

### 12 Venue Types from PDF

| # | Venue Name | Capacity | Price per Session | Deposit | Type |
|---|-----------|----------|------------|---------|------|
| 1 | Classes & Gatherings | 800 | ₹30,000 | ₹12,000 | Hall |
| 2 | Government Programs | 600 | ₹30,000 | ₹12,000 | Hall |
| 3 | Ceremonies & Conferences | 500 | ₹30,000 | ₹12,000 | Hall |
| 4 | Lecture Series | 400 | ₹7,500 | ₹12,000 | Hall |
| 5 | Orchestra & Entertainment | 600 | ₹30,000 | ₹12,000 | Hall |
| 6 | Dance Programs (Lavni) | 500 | ₹15,000 | ₹12,000 | Hall |
| 7 | Drama & Magic | 450 | ₹2,000 | ₹12,000 | Hall |
| 8 | Children Drama (Balnata) | 300 | ₹3,000 | ₹12,000 | Hall |
| 9 | Rehearsal Only Stage | 200 | ₹3,000 | ₹12,000 | Hall |
| 10 | Shubhrai Art Gallery | 150 | ₹1,000/day | — | Gallery |
| 11 | Open Space (V.I.P Front) | 200 | ₹500/day | — | Open |
| 12 | Exhibition & Parking Space | 250 | ₹500/day | — | Open |

Each venue includes:
- **Facilities**: Equipment, amenities, and capabilities (5-7 per venue)
- **Images**: Sample gallery images from Unsplash (scaled to actual venue photos later)
- **Rules**: Booking policies, restrictions, and guidelines (2-4 per venue)
- **Pricing**: Per session (halls) or per day (open spaces/gallery)
  - GST: 9% CGST + 9% SGST = 18% total
  - Extra charges: ₹1,400 for Saturday/Sunday/Public Holidays

## Database Scripts

### Files Created

1. **`004_create_venue_master_tables.sql`**
   - Creates VenueMaster, VenueFacilities, VenueImages, VenueRules tables
   - Sets up foreign keys, indexes, and constraints
   - Run this first to establish the schema

2. **`005_insert_venues_from_pdf.sql`**
   - Inserts all 12 venues with complete details
   - Populates facilities, images, and rules for each venue
   - Uses transaction for data integrity
   - Run after schema creation

3. **`007_insert_venue_pricing.sql`**
   - Populates VenuePricing table with rate data
   - Includes pricing for all 12 venues
   - Separate script for independent execution

4. **`006_venue_pricing_reference.csv`**
   - CSV reference for pricing data
   - Useful for Excel/import tools
   - Contains all pricing metadata

## How to Apply Database Changes

### Option 1: Direct SQL Execution (SQL Server Management Studio)

```sql
-- Run these in sequence:
EXEC sp_executesql N'$(004_create_venue_master_tables.sql)'
EXEC sp_executesql N'$(005_insert_venues_from_pdf.sql)'
EXEC sp_executesql N'$(007_insert_venue_pricing.sql)'
```

### Option 2: EF Core Migration (Recommended for .NET)

```bash
cd backend
dotnet ef migrations add PopulateVenueMasterData
dotnet ef database update
```

### Option 3: Direct Database Connection

```bash
# Using sqlcmd
sqlcmd -S "YourServerName" -d "HutatmaBookingDB" -i "database/004_create_venue_master_tables.sql"
sqlcmd -S "YourServerName" -d "HutatmaBookingDB" -i "database/005_insert_venues_from_pdf.sql"
sqlcmd -S "YourServerName" -d "HutatmaBookingDB" -i "database/007_insert_venue_pricing.sql"
```

## Backend APIs

The following REST endpoints return dynamic venue data:

### `GET /api/venues`
List all active venues with basic info and primary image.

**Response Example:**
```json
[
  {
    "venueId": 1,
    "venueName": "Hutatma Smruti Mandir Hall - Classes & Gatherings",
    "description": "For classes, colleges, and general gatherings...",
    "capacity": 800,
    "location": "Hutatma Chowk, Solapur, MH 413001",
    "status": "Active",
    "primaryImageUrl": "https://images.unsplash.com/...",
    "facilities": ["Stage / Podium", "Seating Arrangement", "Sound System", "Air Conditioning", "Lighting"]
  }
]
```

### `GET /api/venues/{id}`
Get a specific venue by ID.

### `GET /api/venues/{id}/details`
Get complete venue details including facilities, images, rules, and pricing.

**Response Example:**
```json
{
  "venueId": 1,
  "venueName": "Hutatma Smruti Mandir Hall - Classes & Gatherings",
  "description": "...",
  "capacity": 800,
  "location": "Hutatma Chowk, Solapur, MH 413001",
  "status": "Active",
  "facilities": [
    {
      "id": 1,
      "facilityName": "Stage / Podium",
      "description": "Raised stage with spotlights"
    }
  ],
  "images": [
    {
      "id": 1,
      "imageUrl": "https://images.unsplash.com/...",
      "caption": "Main Hall - Front View",
      "isPrimary": true
    }
  ],
  "rules": [
    {
      "id": 1,
      "ruleTitle": "Timings",
      "ruleText": "Venue must be vacated by 11:00 PM"
    }
  ],
  "pricing": [
    {
      "id": 1,
      "priceItemName": "Session (Weekday)",
      "chargeUnit": "Session",
      "amount": 30000.00,
      "refundableDeposit": 12000.00,
      "cgstPercent": 9.00,
      "sgstPercent": 9.00,
      "effectiveFrom": "2026-01-01",
      "effectiveTo": null
    }
  ]
}
```

## Frontend Implementation

The React frontend fetches all venue data dynamically through the APIs:

### HomePage.tsx
- Calls `venueAPI.getAll()` to fetch active venues
- Displays venue count, total capacity, and facility list
- Removed hardcoded static data

### Venue Selection Pages
- Use `venueAPI.getById(id)` for single venue display
- Use `venueAPI.getDetails(id)` for full details with facilities, images, rules, and pricing

### No Hardcoded Data
✓ HTML static venue data removed  
✓ JSON mock data replaced with API calls  
✓ All venue details come from database  
✓ Images sourced from database URLs  

## Key Features

### 1. Relational Integrity
- Foreign keys with cascade delete
- Proper normalization (1:N relationships)
- Status flags for soft deletions

### 2. Flexibility
- DisplayOrder for UI sequencing
- IsActive flags for easy enable/disable
- EffectiveFrom/To dates for pricing periods

### 3. Extensibility
- VenueImages supports multiple images per venue
- VenueFacilities easily add/remove amenities
- VenuePricing handles multiple pricing tiers

### 4. Performance
- Indexed on VenueName for fast lookups
- Efficient select-only queries in APIs
- .AsNoTracking() for read-only operations

## Testing the Setup

### 1. Verify Database
```sql
SELECT COUNT(*) FROM dbo.VenueMaster;        -- Should return 12
SELECT COUNT(*) FROM dbo.VenueFacilities;    -- Should return 50+
SELECT COUNT(*) FROM dbo.VenueImages;        -- Should return 24+
SELECT COUNT(*) FROM dbo.VenueRules;         -- Should return 30+
SELECT COUNT(*) FROM dbo.VenuePricing;       -- Should return 24+
```

### 2. Test Backend API
```bash
# Get all venues
curl http://localhost:5000/api/venues

# Get specific venue
curl http://localhost:5000/api/venues/1

# Get complete details
curl http://localhost:5000/api/venues/1/details
```

### 3. Test Frontend
- Navigate to `http://localhost:3000/`
- Check HomePage displays venues from API
- Click on venue to see full details
- Verify images load from database URLs

## Customization Notes

### Updating Venue Images
Replace Unsplash URLs with actual venue photos:
```sql
UPDATE dbo.VenueImages
SET ImageUrl = 'https://your-cdn.com/venue-1-main.jpg'
WHERE VenueId = 1 AND IsPrimary = 1;
```

### Adjusting Pricing
Modify rates in VenuePricing:
```sql
UPDATE dbo.VenuePricing
SET Amount = 35000.00,
    EffectiveFrom = CAST(GETDATE() AS DATE)
WHERE VenueId = 1 AND PriceItemName = 'Session (Weekday)';
```

### Adding New Venues
```sql
INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
VALUES ('New Venue', 'Description', 300, 'Location', 'Active', 13);
-- Then add facilities, images, rules, and pricing
```

## Summary

✓ **12 venues** from PDF imported with complete details  
✓ **Dynamic APIs** serving venue data (GET /venues, /venues/{id}, /venues/{id}/details)  
✓ **Frontend updated** to fetch from APIs (removed hardcoded data)  
✓ **Relational schema** with proper FK relationships and cascade delete  
✓ **Pricing data** structured separately for flexibility  
✓ **Extensible design** for future additions  

All venue master data is now database-driven, version-controlled, and easily updateable without code changes.
