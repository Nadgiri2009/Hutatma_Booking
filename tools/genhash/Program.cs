using System;
using BCrypt.Net;

Console.WriteLine("Generating bcrypt hash for Admin@123...");
var hash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
Console.WriteLine(hash);