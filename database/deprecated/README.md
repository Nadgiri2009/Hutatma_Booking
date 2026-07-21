# Deprecated — do not run these

These four scripts were a second, parallel attempt at loading the rate-chart
data and conflict with `003_venue_master_from_rate_chart_20230912.sql`, which
is correct and verified directly against the source PDF
(`HSM_-_Rate_Chart_12_09_2023.pdf`).

Problems with these scripts:

- **`005_insert_venues_from_pdf.sql` + `007_insert_venue_pricing.sql`** create
  12 separate venues with amounts that don't match the rate chart (e.g.
  ₹30,000 instead of the real ₹20,000 / ₹10,000 / ₹12,000 tiers, a flat
  ₹1,400 "extra charge" that doesn't appear anywhere in the PDF, and daily
  open-space rates of ₹500 instead of the real ₹7,500 / ₹6,000 / ₹12,000).
  They also omit the 13th line item (the complete parking-side open space)
  and hardcode `VenueId 1–12`, which collides with the IDs `003` already
  assigns.
- **`006_venue_pricing_reference.csv`** is the reference data for the above
  and inherits the same wrong numbers.
- **`008_create_rate_master_tables.sql`** introduces an invented "peak
  season / off-season" pricing model (₹50,000–₹100,000) that has no basis in
  the rate chart at all — the real chart has flat, year-round government
  rates with no seasonal variation.

**Use `003_venue_master_from_rate_chart_20230912.sql` instead** (or, for the
actual running application, the EF Core migration
`backend/Migrations/20260619102310_PopulateVenueMasterData.cs`, which now
contains the same verified data — see `database/README.md`).
