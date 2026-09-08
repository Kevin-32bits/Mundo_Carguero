using Api_M_Carguero.Data;
using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace Api_M_Carguero.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GerenciaController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _config;

    public GerenciaController(ApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult> Login([FromBody] LoginDto dto)
    {
        // 1. Buscamos si existe un empleado activo con ese nombre de usuario
        var empleado = await _context.Empleados
            .Include(e => e.Rol)
            .FirstOrDefaultAsync(e => e.Usuario == dto.Usuario);

        if (empleado == null)
        {
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });
        }

        // NUEVO: Revisamos si está inhabilitado ANTES de revisar la contraseña
        if (!empleado.Activo)
        {
            return Unauthorized(new { mensaje = "Usuario inhabilitado. Comuníquese con gerencia." });
        }

        // 2. Comparamos la contraseña escrita con el Hash guardado en SQL Server
        bool passwordValida = BCrypt.Net.BCrypt.Verify(dto.Password, empleado.Contrasena);

        if (!passwordValida)
        {
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });
        }

        // Obtenemos la llave secreta desde el appsettings.json
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        // Guardamos los datos del usuario dentro del token (Claims)
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, empleado.EmpleadoId.ToString()),
            new Claim(ClaimTypes.Name, empleado.Usuario),
            new Claim(ClaimTypes.Role, empleado.Rol?.NombreRol ?? "SinRol"),
            new Claim("SucursalId", empleado.SucursalId.ToString())
        };

        // Fabricamos el token con una validez de 8 horas
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        // 3. Si todo es correcto, devolvemos sus datos básicos
        return Ok(new
        {
            token = tokenString,
            id = empleado.EmpleadoId,
            nombre = empleado.Nombre,
            usuario = empleado.Usuario,
            rol = empleado.Rol?.NombreRol
        });
    }

    [Authorize]
    [HttpPost("renovar-token")]
    // Requiere que el token actual siga vivo para poder renovarlo
    public async Task<ActionResult> RenovarToken()
    {
        // 1. Obtenemos el ID del empleado directamente del token que envió Angular
        var empleadoIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(empleadoIdString) || !int.TryParse(empleadoIdString, out int empleadoId))
        {
            return Unauthorized(new { mensaje = "Token inválido." });
        }

        // 2. Verificamos que el empleado siga activo en la empresa
        var empleado = await _context.Empleados
            .Include(e => e.Rol)
            .FirstOrDefaultAsync(e => e.EmpleadoId == empleadoId);

        if (empleado == null || !empleado.Activo)
        {
            return Unauthorized(new { mensaje = "Usuario inhabilitado o eliminado." });
        }

        // 3. Fabricamos un token COMPLETAMENTE NUEVO con 8 horas más de vida
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, empleado.EmpleadoId.ToString()),
            new Claim(ClaimTypes.Name, empleado.Usuario),
            new Claim(ClaimTypes.Role, empleado.Rol?.NombreRol ?? "SinRol"),
            new Claim("SucursalId", empleado.SucursalId.ToString())
        };

        var nuevoToken = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8), // ¡Aquí se resetean las 8 horas
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(nuevoToken);

        return Ok(new { token = tokenString });
    }

    [Authorize(Roles = "Gerencia")]
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardGerenciaDto>> GetDashboard([FromQuery] string? periodo = "semana")
    {
        var rango = ResolverPeriodo(periodo);
        var (inicio, fin) = rango.Actual;
        var (inicioPrevio, finPrevio) = rango.Previo;

        var facturasPeriodo = await _context.Facturas
            .AsNoTracking()
            .Where(f => f.FechaEmision >= inicio && f.FechaEmision < fin)
            .ToListAsync();

        var facturasPrevio = await _context.Facturas
            .AsNoTracking()
            .Where(f => f.FechaEmision >= inicioPrevio && f.FechaEmision < finPrevio)
            .ToListAsync();

        var ventasActual = facturasPeriodo.Sum(f => f.Total);
        var ventasPrevio = facturasPrevio.Sum(f => f.Total);
        var clientesActual = facturasPeriodo.Select(f => f.ClienteId).Distinct().Count();
        var clientesPrevio = facturasPrevio.Select(f => f.ClienteId).Distinct().Count();

        var alertasStock = await _context.Inventario
            .AsNoTracking()
            .Include(i => i.Producto)
            .Where(i => i.StockUnidades <= 10)
            .OrderBy(i => i.StockUnidades)
            .ThenBy(i => i.Producto!.Nombre)
            .Take(20)
            .Select(i => new DashboardAlertaStockDto
            {
                Producto = i.Producto != null ? i.Producto.Nombre : $"Producto {i.ProductoId}",
                Stock = i.StockUnidades,
                Nivel = i.StockUnidades <= 5 ? "critico" : "bajo"
            })
            .ToListAsync();

        var sucursales = await _context.Sucursales
            .AsNoTracking()
            .ToDictionaryAsync(s => s.SucursalId, s => s.Nombre);

        var ventasPorTiendaRaw = facturasPeriodo
            .GroupBy(f => f.SucursalId)
            .Select(g => new { SucursalId = g.Key, Total = g.Sum(x => x.Total) })
            .ToList();

        var ventasTiendasFiltradas = ventasPorTiendaRaw
            .Where(v =>
            {
                if (!sucursales.TryGetValue(v.SucursalId, out var nombre))
                {
                    return true;
                }

                return !string.Equals(nombre, "Almacen", StringComparison.OrdinalIgnoreCase);
            })
            .OrderByDescending(v => v.Total)
            .ToList();

        var totalTiendas = ventasTiendasFiltradas.Sum(x => x.Total);
        var ventasPorTienda = ventasTiendasFiltradas.Select(v =>
        {
            var nombre = sucursales.TryGetValue(v.SucursalId, out var n) ? n : $"Ubicacion {v.SucursalId}";
            var porcentaje = totalTiendas > 0 ? Math.Round((v.Total / totalTiendas) * 100m, 2) : 0m;
            return new DashboardTiendaDto
            {
                Nombre = nombre,
                Monto = Math.Round(v.Total, 2),
                Porcentaje = porcentaje
            };
        }).ToList();

        var (serieSemana, serieMes) = ConstruirSeries(facturasPeriodo, fin);

        return Ok(new DashboardGerenciaDto
        {
            Kpis = new DashboardKpisDto
            {
                Ventas = Math.Round(ventasActual, 2),
                Alertas = alertasStock.Count,
                Clientes = clientesActual
            },
            Tendencia = new DashboardTendenciaDto
            {
                Ventas = CalcularTendencia(ventasActual, ventasPrevio),
                Clientes = CalcularTendencia(clientesActual, clientesPrevio)
            },
            VentasSerieSemana = serieSemana,
            VentasSerieMes = serieMes,
            VentasPorTienda = ventasPorTienda,
            AlertasStock = alertasStock
        });
    }

    [Authorize(Roles = "Gerencia")]
    [HttpGet("empleados")]
    public async Task<ActionResult<IEnumerable<EmpleadoListadoGerenciaDto>>> GetEmpleados(
        [FromQuery] string? busqueda = null,
        [FromQuery] int? ubicacionId = null,
        [FromQuery] string? estado = null)
    {
        var query = _context.Empleados
            .AsNoTracking()
            .Include(e => e.Rol)
            .Include(e => e.Sucursal)
            .AsQueryable();

        if (ubicacionId.HasValue)
        {
            query = query.Where(e => e.SucursalId == ubicacionId.Value);
        }

        var estadoNormalizado = (estado ?? string.Empty).Trim().ToLowerInvariant();
        if (estadoNormalizado is "activo" or "activos")
        {
            query = query.Where(e => e.Activo);
        }
        else if (estadoNormalizado is "inactivo" or "inactivos")
        {
            query = query.Where(e => !e.Activo);
        }

        var termino = (busqueda ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(termino))
        {
            query = query.Where(e =>
                e.Nombre.Contains(termino) ||
                e.Dni.Contains(termino) ||
                (e.Usuario != null && e.Usuario.Contains(termino)));
        }

        var empleados = await query
            .OrderByDescending(e => e.Activo)
            .ThenBy(e => e.Nombre)
            .Select(e => new EmpleadoListadoGerenciaDto
            {
                Id = e.EmpleadoId,
                NombreCompleto = e.Nombre,
                Dni = e.Dni,
                Telefono = e.Telefono,
                UbicacionId = e.SucursalId,
                Ubicacion = e.Sucursal != null ? e.Sucursal.Nombre : $"Ubicacion {e.SucursalId}",
                EstadoLaboral = e.Activo,
                RolId = e.RolId,
                Rol = e.Rol != null ? e.Rol.NombreRol : null,
                Usuario = e.Usuario
            })
            .ToListAsync();

        return Ok(empleados);
    }

    [Authorize(Roles = "Gerencia")]
    [HttpPost("empleados")]
    public async Task<ActionResult<EmpleadoListadoGerenciaDto>> CrearEmpleado([FromBody] CrearEmpleadoGerenciaDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var nombre = (dto.NombreCompleto ?? string.Empty).Trim();
        var dni = (dto.Dni ?? string.Empty).Trim();
        var usuarioDto = (dto.Usuario ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { mensaje = "El nombre completo es obligatorio." });
        }

        if (string.IsNullOrWhiteSpace(dni))
        {
            return BadRequest(new { mensaje = "El DNI es obligatorio." });
        }

        var dniExiste = await _context.Empleados.AnyAsync(e => e.Dni == dni);
        if (dniExiste)
        {
            return BadRequest(new { mensaje = "Ya existe un empleado con ese DNI." });
        }

        if (string.IsNullOrWhiteSpace(usuarioDto))
        {
            return BadRequest(new { mensaje = "El nombre de usuario es obligatorio." });
        }

        var usuarioExiste = await _context.Empleados.AnyAsync(e => e.Usuario == usuarioDto);
        if (usuarioExiste)
        {
            return BadRequest(new { mensaje = "Este nombre de usuario ya está en uso. Por favor, elige otro." });
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { mensaje = "La contraseña es obligatoria." });
        }

        if (dto.Password != dto.ConfirmarPassword)
        {
            return BadRequest(new { mensaje = "Las contraseñas no coinciden." });
        }

        var rol = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.RolId == dto.RolId);
        if (rol is null)
        {
            return BadRequest(new { mensaje = "El rol seleccionado no existe." });
        }

        var ubicacion = await _context.Sucursales
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SucursalId == dto.UbicacionId);
        if (ubicacion is null)
        {
            return BadRequest(new { mensaje = "La ubicacion seleccionada no existe." });
        }

        var empleado = new Empleado
        {
            Nombre = nombre,
            Dni = dni,
            Telefono = LimpiarTexto(dto.Telefono, 10),
            RolId = dto.RolId,
            SucursalId = dto.UbicacionId,
            Usuario = usuarioDto,
            Contrasena = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Activo = dto.EstadoLaboral
        };

        _context.Empleados.Add(empleado);
        await _context.SaveChangesAsync();

        return Ok(new EmpleadoListadoGerenciaDto
        {
            Id = empleado.EmpleadoId,
            NombreCompleto = empleado.Nombre,
            Dni = empleado.Dni,
            Telefono = empleado.Telefono,
            UbicacionId = empleado.SucursalId,
            Ubicacion = ubicacion.Nombre,
            EstadoLaboral = empleado.Activo,
            RolId = empleado.RolId,
            Rol = rol.NombreRol,
            Usuario = empleado.Usuario
        });
    }

    [Authorize(Roles = "Gerencia")]
    [HttpPut("empleados/{empleadoId:int}")]
    public async Task<ActionResult<EmpleadoListadoGerenciaDto>> ActualizarEmpleado(
        int empleadoId,
        [FromBody] ActualizarEmpleadoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        // 1. Buscamos al empleado en la base de datos
        var empleado = await _context.Empleados
            .Include(e => e.Rol)
            .Include(e => e.Sucursal)
            .FirstOrDefaultAsync(e => e.EmpleadoId == empleadoId);

        if (empleado is null)
        {
            return NotFound(new { mensaje = "Empleado no encontrado." });
        }

        var nombre = (dto.NombreCompleto ?? string.Empty).Trim();
        var dni = (dto.Dni ?? string.Empty).Trim();
        var usuarioDto = (dto.Usuario ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(nombre)) return BadRequest(new { mensaje = "El nombre completo es obligatorio." });
        if (string.IsNullOrWhiteSpace(dni)) return BadRequest(new { mensaje = "El DNI es obligatorio." });
        if (string.IsNullOrWhiteSpace(usuarioDto)) return BadRequest(new { mensaje = "El nombre de usuario es obligatorio." });

        // 2. Validamos que el DNI no lo tenga OTRA persona
        var dniExiste = await _context.Empleados.AnyAsync(e => e.Dni == dni && e.EmpleadoId != empleadoId);
        if (dniExiste)
        {
            return BadRequest(new { mensaje = "Ya existe otro empleado registrado con ese DNI." });
        }

        // 3. Validamos que el Usuario no lo tenga OTRA persona
        var usuarioExiste = await _context.Empleados.AnyAsync(e => e.Usuario == usuarioDto && e.EmpleadoId != empleadoId);
        if (usuarioExiste)
        {
            return BadRequest(new { mensaje = "Este nombre de usuario ya está en uso por otra persona." });
        }

        // 4. Validamos que Rol y Ubicación existan
        var rol = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RolId == dto.RolId);
        if (rol is null) return BadRequest(new { mensaje = "El rol seleccionado no existe." });

        var ubicacion = await _context.Sucursales.AsNoTracking().FirstOrDefaultAsync(s => s.SucursalId == dto.UbicacionId);
        if (ubicacion is null) return BadRequest(new { mensaje = "La ubicacion seleccionada no existe." });

        // 5. Actualizamos los datos del modelo
        empleado.Nombre = nombre;
        empleado.Dni = dni;
        empleado.Telefono = LimpiarTexto(dto.Telefono, 10);
        empleado.RolId = dto.RolId;
        empleado.SucursalId = dto.UbicacionId;
        empleado.Usuario = usuarioDto;

        // 6. ACTUALIZAR CONTRASEÑA SOLO SI SE ENVIÓ UNA NUEVA
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            empleado.Contrasena = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        await _context.SaveChangesAsync();

        return Ok(new EmpleadoListadoGerenciaDto
        {
            Id = empleado.EmpleadoId,
            NombreCompleto = empleado.Nombre,
            Dni = empleado.Dni,
            Telefono = empleado.Telefono,
            UbicacionId = empleado.SucursalId,
            Ubicacion = ubicacion.Nombre,
            EstadoLaboral = empleado.Activo,
            RolId = empleado.RolId,
            Rol = rol.NombreRol,
            Usuario = empleado.Usuario
        });
    }

    [Authorize(Roles = "Gerencia")]
    [HttpPut("empleados/{empleadoId:int}/estado")]
    public async Task<ActionResult<EmpleadoListadoGerenciaDto>> ActualizarEstadoEmpleado(
        int empleadoId,
        [FromBody] ActualizarEstadoEmpleadoGerenciaDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var empleado = await _context.Empleados
            .Include(e => e.Rol)
            .Include(e => e.Sucursal)
            .FirstOrDefaultAsync(e => e.EmpleadoId == empleadoId);

        if (empleado is null)
        {
            return NotFound(new { mensaje = "Empleado no encontrado." });
        }

        empleado.Activo = dto.EstadoLaboral == 1;
        await _context.SaveChangesAsync();

        return Ok(new EmpleadoListadoGerenciaDto
        {
            Id = empleado.EmpleadoId,
            NombreCompleto = empleado.Nombre,
            Dni = empleado.Dni,
            Telefono = empleado.Telefono,
            UbicacionId = empleado.SucursalId,
            Ubicacion = empleado.Sucursal != null ? empleado.Sucursal.Nombre : $"Ubicacion {empleado.SucursalId}",
            EstadoLaboral = empleado.Activo,
            RolId = empleado.RolId,
            Rol = empleado.Rol?.NombreRol,
            Usuario = empleado.Usuario
        });
    }


    [Authorize(Roles = "Gerencia")]
    [HttpGet("catalogo/ubicaciones")]
    public async Task<ActionResult<IEnumerable<CatalogoIdNombreDto>>> GetUbicaciones()
    {
        var data = await _context.Sucursales
            .AsNoTracking()
            .OrderBy(s => s.Nombre)
            .Select(s => new CatalogoIdNombreDto
            {
                Id = s.SucursalId,
                Nombre = s.Nombre
            })
            .ToListAsync();

        return Ok(data);
    }


    [Authorize(Roles = "Gerencia")]
    [HttpGet("catalogo/roles")]
    public async Task<ActionResult<IEnumerable<CatalogoIdNombreDto>>> GetRoles()
    {
        var data = await _context.Roles
            .AsNoTracking()
            .OrderBy(r => r.NombreRol)
            .Select(r => new CatalogoIdNombreDto
            {
                Id = r.RolId,
                Nombre = r.NombreRol
            })
            .ToListAsync();

        return Ok(data);
    }

    private static ((DateTime Inicio, DateTime Fin) Actual, (DateTime Inicio, DateTime Fin) Previo) ResolverPeriodo(string? periodo)
    {
        var hoy = DateTime.Now.Date;
        var key = (periodo ?? "semana").Trim().ToLowerInvariant();

        return key switch
        {
            "hoy" => ((hoy, hoy.AddDays(1)), (hoy.AddDays(-1), hoy)),
            "mes" => ((hoy.AddDays(-30), hoy.AddDays(1)), (hoy.AddDays(-60), hoy.AddDays(-30))),
            "anio" => ((hoy.AddDays(-365), hoy.AddDays(1)), (hoy.AddDays(-730), hoy.AddDays(-365))),
            _ => ((hoy.AddDays(-7), hoy.AddDays(1)), (hoy.AddDays(-14), hoy.AddDays(-7)))
        };
    }

    private static decimal CalcularTendencia(decimal actual, decimal previo)
    {
        if (previo <= 0)
        {
            return actual > 0 ? 100m : 0m;
        }

        return Math.Round(((actual - previo) / previo) * 100m, 2);
    }

    private static (List<DashboardSerieItemDto> Semana, List<DashboardSerieItemDto> Mes) ConstruirSeries(
        List<Factura> facturasPeriodo,
        DateTime finPeriodo)
    {
        var culturaEs = new CultureInfo("es-PE");
        var fechaFin = finPeriodo.Date;

        var inicioSemana = fechaFin.AddDays(-6);
        var serieSemana = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var fecha = inicioSemana.AddDays(offset);
                var totalDia = facturasPeriodo
                    .Where(f => f.FechaEmision.Date == fecha)
                    .Sum(f => f.Total);

                return new DashboardSerieItemDto
                {
                    Label = culturaEs.DateTimeFormat.GetAbbreviatedDayName(fecha.DayOfWeek),
                    Total = Math.Round(totalDia, 2)
                };
            })
            .ToList();

        var semanas = new List<DashboardSerieItemDto>();
        var inicioBaseMes = fechaFin.AddDays(-27);
        for (var i = 0; i < 4; i++)
        {
            var inicio = inicioBaseMes.AddDays(i * 7);
            var fin = inicio.AddDays(7);
            var total = facturasPeriodo
                .Where(f => f.FechaEmision >= inicio && f.FechaEmision < fin)
                .Sum(f => f.Total);

            semanas.Add(new DashboardSerieItemDto
            {
                Label = $"Semana {i + 1}",
                Total = Math.Round(total, 2)
            });
        }

        return (serieSemana, semanas);
    }

    private static string? LimpiarTexto(string? valor, int max)
    {
        var texto = (valor ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(texto))
        {
            return null;
        }

        return texto.Length > max ? texto[..max] : texto;
    }
}
