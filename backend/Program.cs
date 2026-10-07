using HutatmaBooking.API.Data;
using HutatmaBooking.API.Middleware;
using HutatmaBooking.API.Repositories;
using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

var aspnetCoreEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
if (string.IsNullOrWhiteSpace(aspnetCoreEnv))
{
    Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
    Console.WriteLine("ASPNETCORE_ENVIRONMENT was not set. Defaulting to Development.");
}

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// Validate Razorpay configuration early to avoid silent auth failures
var paymentProvider = builder.Configuration["PaymentGateway:Provider"] ?? "Mock";
if (paymentProvider == "Razorpay")
{
    var razorpayKey = builder.Configuration["PaymentGateway:Razorpay:Key"]
        ?? builder.Configuration["PaymentGateway:Key"]
        ?? builder.Configuration["RAZORPAY_KEY_ID"];
    var razorpaySecret = builder.Configuration["PaymentGateway:Razorpay:Secret"]
        ?? builder.Configuration["PaymentGateway:Secret"]
        ?? builder.Configuration["RAZORPAY_KEY_SECRET"];
    if (string.IsNullOrWhiteSpace(razorpayKey) || string.IsNullOrWhiteSpace(razorpaySecret) ||
        razorpayKey.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase) ||
        razorpaySecret.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "Razorpay credentials are not configured. Set PaymentGateway:Razorpay:Key and PaymentGateway:Razorpay:Secret in appsettings.json or environment variables.");
    }
}

// Database
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => 
        {
            sql.EnableRetryOnFailure();
            sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        }));

// JWT Auth
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer          = true,
            ValidIssuer             = builder.Configuration["Jwt:Issuer"],
            ValidateAudience        = true,
            ValidAudience           = builder.Configuration["Jwt:Audience"],
            ValidateLifetime        = true,
            ClockSkew               = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly",  p => p.RequireRole("Admin"));
    opt.AddPolicy("StaffPlus",  p => p.RequireRole("Admin", "Staff"));
    opt.AddPolicy("RefundReviewers", p => p.RequireRole("Admin", "Clerk"));
    opt.AddPolicy("ClerkOnly", p => p.RequireRole("Clerk"));
});

// Make HttpContext available to services that need it (e.g. AuditService)
builder.Services.AddHttpContextAccessor();

// Razorpay / external HTTP integration
builder.Services.AddHttpClient();

// Repositories
builder.Services.AddScoped<IBookingRepository,  BookingRepository>();
builder.Services.AddScoped<IHolidayRepository,  HolidayRepository>();
builder.Services.AddScoped<IPaymentRepository,  PaymentRepository>();
builder.Services.AddScoped<IGalleryRepository,  GalleryRepository>();
builder.Services.AddScoped<INoticeRepository,   NoticeRepository>();
builder.Services.AddScoped<IUserRepository,     UserRepository>();

// Services
builder.Services.AddScoped<IAuthService,        AuthService>();
builder.Services.AddScoped<IBookingService,     BookingService>();
builder.Services.AddScoped<IHolidayService,     HolidayService>();
builder.Services.AddScoped<IPaymentService,     PaymentService>();
builder.Services.AddScoped<IGalleryService,     GalleryService>();
builder.Services.AddScoped<INoticeService,      NoticeService>();
builder.Services.AddScoped<IReceiptService,     ReceiptService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IAuditService,       AuditService>();

builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new HutatmaBooking.API.Utils.DateOnlyJsonConverter("dd-MM-yyyy"));
        opts.JsonSerializerOptions.Converters.Add(new HutatmaBooking.API.Utils.NullableDateOnlyJsonConverter("dd-MM-yyyy"));
        opts.JsonSerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
    });
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Hutatma Booking API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header: Bearer {token}",
        Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowFrontend", p =>
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod())
    );

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hutatma Booking API v1"));

app.UseStaticFiles();
app.UseCors("AllowFrontend");
app.UseMiddleware<ExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Initialize, Migrate, and Seed Database safely away from Program.cs
try
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        DbInitializer.Initialize(services);
    }
}
catch (Exception ex)
{
    Log.Fatal(ex, "An error occurred during database initialization on startup.");
}

app.Run();