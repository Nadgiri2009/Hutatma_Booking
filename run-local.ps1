# PowerShell script to build and run backend and frontend locally
# Edit backend\appsettings.json to set your SQL Server connection string before running.

param(
    [switch]$ApplyMigrations,
    [switch]$RunBackend
)

Write-Host "Building backend project..."
dotnet build "backend\HutatmaBooking.API.csproj" --configuration Debug

Write-Host "Building frontend Web Forms project..."
dotnet build "frontend\HutatmaBooking.WebForms.csproj" --configuration Debug

if ($ApplyMigrations) {
    Write-Host "Applying EF Core migrations..."
    dotnet ef database update --project "backend\HutatmaBooking.API.csproj"
}

if ($RunBackend) {
    Write-Host "Starting backend API (will run in foreground). Use Ctrl+C to stop."
    dotnet run --project "backend\HutatmaBooking.API.csproj"
}

Write-Host "Done. To run the frontend, open the frontend project in Visual Studio and run with IIS Express."
