using Api_M_Carguero.Configurations;
using Api_M_Carguero.Data;
using Api_M_Carguero.Services;
using Api_M_Carguero.Services.Common;
using Api_M_Carguero.Services.Transferencias;
using Api_M_Carguero.Services.Transferencias.Strategies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IPdfService, PdfService>();
builder.Services.AddSingleton<IApplicationClock, SystemApplicationClock>();
builder.Services.AddSingleton<ITransferenciaAutorizacionStrategy, PendienteTransferenciaAutorizacionStrategy>();
builder.Services.AddSingleton<ITransferenciaAutorizacionStrategy, AprobadaTransferenciaAutorizacionStrategy>();
builder.Services.AddSingleton<ITransferenciaAutorizacionStrategy, FallbackTransferenciaAutorizacionStrategy>();
builder.Services.AddScoped<ITransferenciaFacade, TransferenciaFacade>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularPolicy", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin))
                {
                    return false;
                }

                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero
        };
    });


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
QuestPDF.Settings.License = LicenseType.Community;

var jwtKey = builder.Configuration["Jwt:Key"];

// Validamos si la llave está vacía o no existe
if (string.IsNullOrEmpty(jwtKey))
{
    throw new Exception("ERROR CRÍTICO: La clave secreta 'Jwt:Key' no está configurada en el appsettings.json.");
}

var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();

app.UseCors("AngularPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();
