# Hutatma Smruti Mandir — Venue Booking System
## Complete Production-Ready Enterprise Application

---

## 📁 Project Structure

```
hutatma-booking-system/
├── frontend/                          # React 18 + TypeScript + MUI
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.tsx                    # Root with React Router
│   │   ├── index.tsx                  # Entry point
│   │   ├── theme/
│   │   │   └── theme.ts               # MUI Navy + Gold theme
│   │   ├── store/
│   │   │   ├── store.ts               # Redux Toolkit store
│   │   │   └── slices/
│   │   │       ├── authSlice.ts       # JWT auth state
│   │   │       ├── bookingSlice.ts    # 5-step wizard state
│   │   │       └── uiSlice.ts         # Sidebar / UI state
│   │   ├── services/
│   │   │   └── api.ts                 # Axios + all API calls
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── PublicNavbar.tsx   # Responsive public nav
│   │   │       └── AdminLayout.tsx    # Sidebar + AppBar admin
│   │   └── pages/
│   │       ├── public/
│   │       │   ├── HomePage.tsx       # Hero slider + sections
│   │       │   ├── BookingPage.tsx    # 5-step booking wizard
│   │       │   └── PublicPages.tsx    # About / Gallery / Contact / Print
│   │       └── admin/
│   │           ├── AdminLoginPage.tsx
│   │           ├── AdminDashboard.tsx
│   │           ├── AdminBookingsPage.tsx
│   │           └── AdminPremisesHolidaysPage.tsx
│   └── package.json
│
├── backend/                           # ASP.NET Core 8 Web API
│   ├── Program.cs                     # DI, JWT, CORS, Swagger setup
│   ├── appsettings.json               # Config (JWT, DB, CORS)
│   ├── HutatmaBooking.API.csproj      # .NET 8 project file
│   ├── Data/
│   │   └── AppDbContext.cs            # EF Core DbContext + seed
│   ├── Models/
│   │   └── Models.cs                  # All 16 domain entities
│   ├── DTOs/
│   │   └── DTOs.cs                    # All request/response DTOs
│   ├── Services/
│   │   ├── Interfaces/IServices.cs    # Service interfaces
│   │   ├── AuthService.cs             # JWT login
│   │   ├── BookingService.cs          # Conflict validation + CRUD
│   │   └── AuditService.cs            # Audit logging
│   ├── Repositories/
│   │   ├── Interfaces/IRepositories.cs
│   │   └── Repositories.cs            # All EF Core repos
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── BookingsController.cs
│   │   └── AdminControllers.cs        # Premises/Rates/Holidays/etc.
│   └── Middleware/
│       └── ExceptionMiddleware.cs     # Global exception + audit
│
└── database/
    └── 001_CreateSchema.sql           # Complete SQL Server schema
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (frontend)
- .NET 8 SDK (backend)
- SQL Server 2022
- Visual Studio 2022 or VS Code

---

### 1. Database Setup

```sql
-- Run in SQL Server Management Studio
-- File: database/001_CreateSchema.sql

-- After running,    the admin user with a real BCrypt hash:
UPDATE Users
SET PasswordHash = '<bcrypt_hash_of_Admin@123>'
WHERE Email = 'admin@hutatmamandir.org';
```

Generate BCrypt hash in .NET:
```csharp
string hash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
```

---

### 2. Backend Setup

```bash
cd backend

# Restore packages
dotnet restore

# Update connection string in appsettings.json:
# "DefaultConnection": "Server=YOUR_SERVER;Database=HutatmaBookingDB;..."

# Apply EF migrations (if using code-first)
dotnet ef migrations add InitialCreate
dotnet ef database update

# Run
dotnet run
# API available at: http://localhost:5000
# Swagger UI at:    http://localhost:5000/swagger
```

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file:
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
# App available at: http://localhost:3000
```

---

## 🔐 Default Admin Credentials

```
Email:    admin@hutatmamandir.org
Password: Admin@123
```

> ⚠️ Change these immediately after first login in production!

---

## 📋 Booking Conflict Validation Logic

```
EXISTING     NEW REQUEST    RESULT
---------    -----------    ------
Morning  →   Evening    →   ✅ ALLOW
Morning  →   Full Day   →   ❌ REJECT
Evening  →   Morning    →   ✅ ALLOW
Evening  →   Full Day   →   ❌ REJECT
Full Day →   Morning    →   ❌ REJECT
Full Day →   Evening    →   ❌ REJECT
Full Day →   Full Day   →   ❌ REJECT
```

---

## 🏗️ Production Deployment

### Frontend (React)
```bash
cd frontend
npm run build
# Upload /build folder to IIS wwwroot or Nginx
```

**IIS Web.config for React SPA:**
```xml
<?xml version="1.0"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### Backend (ASP.NET Core on IIS)
```bash
cd backend
dotnet publish -c Release -o ./publish

# In IIS:
# 1. Create Application Pool (.NET CLR version: No Managed Code)
# 2. Create website pointing to ./publish folder
# 3. Install ASP.NET Core Hosting Bundle on Windows Server
```

**Production appsettings:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=PROD_SERVER;Database=HutatmaBookingDB;User Id=sa;Password=STRONG_PASS;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "CHANGE_THIS_TO_64_CHAR_RANDOM_SECRET_KEY_IN_PRODUCTION",
    "Issuer": "HutatmaBookingAPI",
    "Audience": "HutatmaBookingClient",
    "ExpiryHours": "8"
  },
  "AllowedOrigins": "https://yourdomain.com"
}
```

> Payment gateway credentials
> - Set `PaymentGateway:Provider` to `Razorpay`
> - Provide valid Razorpay values in `PaymentGateway:Razorpay:Key` and `PaymentGateway:Razorpay:Secret`
> - For environment variables use `PaymentGateway__Razorpay__Key` and `PaymentGateway__Razorpay__Secret`

### SSL Certificate
```bash
# Using Let's Encrypt (certbot) on Windows:
# Or purchase SSL from trusted CA and bind in IIS
```

### Database Backup Strategy
```sql
-- Weekly full backup
BACKUP DATABASE HutatmaBookingDB
TO DISK = 'D:\Backups\HutatmaBookingDB_Full.bak'
WITH FORMAT, COMPRESSION;

-- Daily differential backup
BACKUP DATABASE HutatmaBookingDB
TO DISK = 'D:\Backups\HutatmaBookingDB_Diff.bak'
WITH DIFFERENTIAL, COMPRESSION;
```

---

## 📱 Responsive Design

| Breakpoint | Description          |
|-----------|----------------------|
| xs (0px+) | Mobile phones        |
| sm (600px+) | Tablets            |
| md (900px+) | Small laptops      |
| lg (1200px+) | Desktops          |
| xl (1536px+) | Large screens      |

---

## 🔌 API Endpoints

| Method | Endpoint                        | Auth    | Description              |
|--------|--------------------------------|---------|--------------------------|
| POST   | /api/auth/login                | Public  | Admin login              |
| POST   | /api/bookings/availability     | Public  | Check date availability  |
| POST   | /api/bookings/summary          | Public  | Get cost breakdown       |
| POST   | /api/bookings                  | Public  | Submit booking           |
| GET    | /api/bookings/number/{num}     | Public  | Search by booking ID     |
| GET    | /api/bookings/mobile/{mob}     | Public  | Search by mobile         |
| GET    | /api/bookings                  | Staff+  | Get all (paged/filtered) |
| PUT    | /api/bookings/{id}/approve     | Staff+  | Approve booking          |
| PUT    | /api/bookings/{id}/reject      | Staff+  | Reject booking           |
| GET    | /api/premises                  | Public  | Get all premises         |
| POST   | /api/premises                  | Admin   | Create premise           |
| PUT    | /api/premises/{id}             | Admin   | Update premise           |
| GET    | /api/rates/premise/{id}        | Public  | Get rates                |
| POST   | /api/rates                     | Admin   | Create rate              |
| GET    | /api/holidays                  | Public  | Get holidays             |
| POST   | /api/holidays                  | Staff+  | Add holiday              |
| POST   | /api/payments/verify           | Staff+  | Verify payment           |
| GET    | /api/dashboard                 | Staff+  | Dashboard stats          |
| GET    | /api/notices/active            | Public  | Active notices           |
| GET    | /api/gallery                   | Public  | Gallery items            |

Full Swagger docs at: `http://localhost:5000/swagger`

---

## 🎨 Color System

| Token          | Value     | Usage              |
|---------------|-----------|--------------------|
| Primary Main  | #1a3a6b  | Navy Blue          |
| Primary Dark  | #0f2340  | Darker Navy        |
| Secondary     | #c9a227  | Gold Accent        |
| Background    | #f5f7fa  | Page background    |
| Text Primary  | #1a2332  | Headings           |
| Text Secondary| #5a6a7e  | Subtitles          |

---

## ✅ Features Completed

### Public Website
- [x] Hero image slider with auto-play and fade
- [x] Responsive navbar with hamburger menu
- [x] Home page (stats, features, amenities, CTA, footer)
- [x] About Venue page
- [x] Gallery page with lightbox
- [x] Contact page with form
- [x] Print Booking Details (search by ID or mobile)
- [x] 5-step booking wizard with validation
- [x] Availability calendar with session status
- [x] Booking summary with live cost calculation
- [x] Applicant details with dynamic ID proof upload
- [x] Bank details form
- [x] Booking submission with success screen

### Admin Panel
- [x] JWT-secured login page
- [x] Collapsible sidebar navigation
- [x] Dashboard with stats cards and recent bookings
- [x] Bookings management (approve / reject / search / filter)
- [x] Premises CRUD
- [x] Holiday management CRUD
- [x] Role-based authorization (Admin / Staff)
- [x] Global exception handling middleware
- [x] Audit logging

### Backend / Database
- [x] 16-table SQL Server schema with proper constraints
- [x] Clean Architecture (Repository + Service pattern)
- [x] JWT authentication with role claims
- [x] Booking conflict validation (all 7 session rules)
- [x] Cost calculation with GST and holiday surcharge
- [x] Swagger UI with Bearer token support
- [x] Serilog structured logging
- [x] CORS configuration

---

## 📞 Support

For technical queries: admin@hutatmamandir.org
#   H u t a t m a _ B o o k i n g  
 