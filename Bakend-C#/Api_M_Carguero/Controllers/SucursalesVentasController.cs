using Api_M_Carguero.Data;
using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;
using Api_M_Carguero.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Api_M_Carguero.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class SucursalesVentasController : ControllerBase
{
    private const decimal IgvRate = 0.18m;
    private const decimal IgvMultiplier = 1 + IgvRate;

    private static readonly HashSet<string> TiposDocumentoPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "DNI",
        "RUC"
    };

    private static readonly HashSet<string> TiposComprobantePermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "Factura",
        "Boleta"
    };

    private static readonly HashSet<string> MetodosPagoPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "Efectivo",
        "Tarjeta",
        "Transferencia",
        "Billetera Digital"
    };

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IPdfService _pdfService;
    private readonly ILogger<SucursalesVentasController> _logger;

    public SucursalesVentasController(
        ApplicationDbContext context,
        IEmailService emailService,
        IPdfService pdfService,
        ILogger<SucursalesVentasController> logger)
    {
        _context = context;
        _emailService = emailService;
        _pdfService = pdfService;
        _logger = logger;
    }

    // Método central para obtener el ID de la sucursal desde el Token
    private int ObtenerSucursalId()
    {
        var idClaim = User.FindFirst("SucursalId")?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }
    private int ObtenerEmpleadoIdActual()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }

    [HttpGet("clientes")]
    [Authorize(Roles = "Sucursal1, Sucursal2, Gerencia")]
    public async Task<ActionResult<IEnumerable<ClienteListadoDto>>> GetClientes([FromQuery] string? busqueda = null)
    {
        var termino = (busqueda ?? string.Empty).Trim();

        var query = _context.Clientes.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(termino))
        {
            query = query.Where(c => c.NumeroDocumento.Contains(termino));
        }

        var clientes = await query
            .OrderBy(c => c.Nombre)
            .Select(c => new ClienteListadoDto
            {
                ClienteId = c.ClienteId,
                TipoDocumento = c.TipoDocumento,
                NumeroDocumento = c.NumeroDocumento,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Correo = c.Correo,
                Direccion = c.Direccion,
            })
            .ToListAsync();

        return Ok(clientes);
    }

    [HttpGet("clientes/buscar")]
    [Authorize(Roles = "Sucursal1, Sucursal2, Gerencia")]
    public async Task<ActionResult<ClienteBusquedaDto?>> BuscarCliente([FromQuery] string? nombre = null, [FromQuery] string? numeroDocumento = null)
    {
        var docTermino = (numeroDocumento ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(docTermino))
        {
            return BadRequest(new { mensaje = "Debes enviar numeroDocumento para buscar cliente." });
        }

        var cliente = await _context.Clientes
            .AsNoTracking()
            .Where(c => c.NumeroDocumento.Contains(docTermino))
            .OrderBy(c => c.Nombre)
            .Select(c => new ClienteBusquedaDto
            {
                ClienteId = c.ClienteId,
                TipoDocumento = c.TipoDocumento,
                NumeroDocumento = c.NumeroDocumento,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                Correo = c.Correo,
                Direccion = c.Direccion,
            })
            .FirstOrDefaultAsync();

        return Ok(cliente);
    }

    [HttpPost("clientes")]
    [Authorize(Roles = "Sucursal1, Sucursal2, Gerencia")]
    public async Task<ActionResult<ClienteListadoDto>> CrearCliente([FromBody] CrearClienteDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var tipoDocumento = (dto.TipoDocumento ?? string.Empty).Trim().ToUpperInvariant();
        var numeroDocumento = (dto.NumeroDocumento ?? string.Empty).Trim();
        var nombre = (dto.Nombre ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(tipoDocumento) || string.IsNullOrWhiteSpace(numeroDocumento) || string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { mensaje = "Tipo documento, numero documento y nombre son obligatorios." });
        }

        if (!TipoDocumentoEsValido(tipoDocumento))
        {
            return BadRequest(new { mensaje = "Solo se permite tipo de documento DNI o RUC." });
        }

        var cliente = await _context.Clientes
            .FirstOrDefaultAsync(c => c.NumeroDocumento == numeroDocumento);

        if (cliente is null)
        {
            cliente = new Cliente
            {
                TipoDocumento = tipoDocumento,
                NumeroDocumento = numeroDocumento,
                Nombre = nombre,
                Telefono = LimpiarTexto(dto.Telefono),
                Correo = LimpiarTexto(dto.Correo),
                Direccion = LimpiarTexto(dto.Direccion),
            };

            _context.Clientes.Add(cliente);
        }
        else
        {
            cliente.TipoDocumento = tipoDocumento;
            cliente.NumeroDocumento = numeroDocumento;
            cliente.Nombre = nombre;
            cliente.Telefono = LimpiarTexto(dto.Telefono);
            cliente.Correo = LimpiarTexto(dto.Correo);
            cliente.Direccion = LimpiarTexto(dto.Direccion);
        }

        await _context.SaveChangesAsync();
        return Ok(MapearClienteListado(cliente));
    }

    [HttpPut("clientes/{clienteId:int}")]
    [Authorize(Roles = "Sucursal1, Sucursal2, Gerencia")]
    public async Task<ActionResult<ClienteListadoDto>> ActualizarCliente(int clienteId, [FromBody] CrearClienteDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.ClienteId == clienteId);
        if (cliente is null)
        {
            return NotFound(new { mensaje = "No se encontro el cliente." });
        }

        var tipoDocumento = (dto.TipoDocumento ?? string.Empty).Trim().ToUpperInvariant();
        var numeroDocumento = (dto.NumeroDocumento ?? string.Empty).Trim();
        var nombre = (dto.Nombre ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(tipoDocumento) || string.IsNullOrWhiteSpace(numeroDocumento) || string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { mensaje = "Tipo documento, numero documento y nombre son obligatorios." });
        }

        if (!TipoDocumentoEsValido(tipoDocumento))
        {
            return BadRequest(new { mensaje = "Solo se permite tipo de documento DNI o RUC." });
        }

        var existeDuplicado = await _context.Clientes
            .AnyAsync(c => c.ClienteId != clienteId && c.NumeroDocumento == numeroDocumento);

        if (existeDuplicado)
        {
            return BadRequest(new { mensaje = "Ya existe otro cliente con ese documento." });
        }

        cliente.TipoDocumento = tipoDocumento;
        cliente.NumeroDocumento = numeroDocumento;
        cliente.Nombre = nombre;
        cliente.Telefono = LimpiarTexto(dto.Telefono);
        cliente.Correo = LimpiarTexto(dto.Correo);
        cliente.Direccion = LimpiarTexto(dto.Direccion);

        await _context.SaveChangesAsync();
        return Ok(MapearClienteListado(cliente));

    }

    [HttpDelete("clientes/{clienteId:int}")]
    [Authorize(Roles = "Sucursal1, Sucursal2, Gerencia")]
    public async Task<IActionResult> EliminarCliente(int clienteId)
    {
        var cliente = await _context.Clientes.FirstOrDefaultAsync(c => c.ClienteId == clienteId);
        if (cliente is null)
        {
            return NotFound(new { mensaje = "No se encontro el cliente." });
        }

        _context.Clientes.Remove(cliente);
        try
        {
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new { mensaje = "No se puede eliminar el cliente porque tiene cotizaciones o ventas asociadas." });
        }
    }

    [HttpGet("cotizaciones")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<IEnumerable<CotizacionListadoDto>>> GetCotizaciones()
    {
        var sucursalId = ObtenerSucursalId();

        var cotizaciones = await _context.Cotizaciones
            .AsNoTracking()
            .Include(c => c.Cliente)
            .Where(c => c.SucursalId == sucursalId)
            .OrderByDescending(c => c.FechaCotizacion)
            .Select(c => new CotizacionListadoDto
            {
                CotizacionId = c.CotizacionId,
                Id = c.Codigo,
                Fecha = c.FechaCotizacion.ToString("MM/dd/yyyy"),
                Cliente = c.Cliente != null ? c.Cliente.Nombre : "Cliente no definido",
                Documento = c.Cliente != null ? $"{c.Cliente.TipoDocumento}: {c.Cliente.NumeroDocumento}" : string.Empty,
                Estado = c.Estado,
                Total = c.Total
            })
            .ToListAsync();

        return Ok(cotizaciones);
    }

    [HttpGet("cotizaciones/{cotizacionId:long}")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]

    public async Task<ActionResult<CotizacionClienteDetalleDto>> GetCotizacionDetalle(long cotizacionId)
    {
        var sucursalId = ObtenerSucursalId();

        var cotizacion = await _context.Cotizaciones
            .AsNoTracking()
            .Include(c => c.Cliente)
            .Include(c => c.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(c => c.CotizacionId == cotizacionId && c.SucursalId == sucursalId);

        if (cotizacion is null)
        {
            return NotFound(new { mensaje = "No se encontro la cotizacion." });
        }

        return Ok(new CotizacionClienteDetalleDto
        {
            CotizacionId = cotizacion.CotizacionId,
            Id = cotizacion.Codigo,
            Fecha = cotizacion.FechaCotizacion.ToString("MM/dd/yyyy"),
            Estado = cotizacion.Estado,
            Total = cotizacion.Total,
            ClienteId = cotizacion.ClienteId,
            TipoDocumento = cotizacion.Cliente?.TipoDocumento ?? "DNI",
            NumeroDocumento = cotizacion.Cliente?.NumeroDocumento ?? string.Empty,
            ClienteNombre = cotizacion.Cliente?.Nombre ?? string.Empty,
            Telefono = cotizacion.Cliente?.Telefono,
            Correo = cotizacion.Cliente?.Correo,
            Direccion = cotizacion.Cliente?.Direccion,
            Items = cotizacion.Detalles
                .OrderBy(d => d.CotizacionDetalleId)
                .Select(d => new CotizacionItemDto
                {
                    CotizacionDetalleId = d.CotizacionDetalleId,
                    ProductoId = d.ProductoId,
                    Sku = d.Producto?.Sku ?? string.Empty,
                    Nombre = d.Producto?.Nombre ?? string.Empty,
                    CantidadCajas = (sucursalId == 3)
                        ? d.Cantidad
                        : (d.Producto != null && d.Producto.UnidadesPorCaja > 0
                            ? d.Cantidad / d.Producto.UnidadesPorCaja
                            : d.Cantidad),
                    PrecioCaja = d.PrecioUnitario,
                    SubTotal = d.SubTotal
                })
                .ToList()
        });
    }

    [HttpPost("cotizaciones")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<CotizacionListadoDto>> CrearCotizacion([FromBody] CrearCotizacionDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var sucursalId = ObtenerSucursalId();
        var empleadoId = ObtenerEmpleadoIdActual();

        if (empleadoId == 0) return Unauthorized(new { mensaje = "Sesión inválida." });

        var empleadoSucursal = await _context.Empleados
            .AnyAsync(e => e.EmpleadoId == empleadoId && e.Activo && e.SucursalId == sucursalId);

        if (!empleadoSucursal)
        {
            return BadRequest(new { mensaje = "Tu usuario no está activo o no pertenece a esta sucursal." });
        }

        var tipoDoc = (dto.TipoDocumento ?? string.Empty).Trim().ToUpperInvariant();
        if (!TipoDocumentoEsValido(tipoDoc))
        {
            return BadRequest(new { mensaje = "Solo se permite tipo de documento DNI o RUC." });
        }

        var items = dto.Items
            .Where(i => i.CantidadCajas > 0)
            .GroupBy(i => i.ProductoId)
            .Select(g => new
            {
                ProductoId = g.Key,
                CantidadCajas = g.Sum(x => x.CantidadCajas),
                PrecioCaja = g.Last().PrecioCaja,
            })
            .ToList();

        if (items.Count == 0)
        {
            return BadRequest(new { mensaje = "Debes agregar al menos un producto al carrito." });
        }

        var productoIds = items.Select(i => i.ProductoId).Distinct().ToList();
        var productos = await _context.Productos
            .AsNoTracking()
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        if (productos.Count != productoIds.Count)
        {
            return BadRequest(new { mensaje = "Hay productos del carrito que no existen en la base de datos." });
        }

        var inventarioSucursal = await _context.Inventario
            .AsNoTracking()
            .Where(i => i.SucursalId == sucursalId && productoIds.Contains(i.ProductoId))
            .ToDictionaryAsync(i => i.ProductoId);

        // 1. VALIDACIÓN DE STOCK DINÁMICA
        foreach (var item in items)
        {
            if (!inventarioSucursal.TryGetValue(item.ProductoId, out var inventario))
            {
                return BadRequest(new { mensaje = $"El producto {item.ProductoId} no existe en el inventario de la sucursal actual." });
            }

            var producto = productos[item.ProductoId];

            // Realizar la equivalencia: Sucursal 2 es ID 3 en la base de datos
            int unidadesSolicitadas = (sucursalId == 3)
                ? item.CantidadCajas
                : item.CantidadCajas * Math.Max(producto.UnidadesPorCaja, 1);

            if (unidadesSolicitadas > inventario.StockUnidades)
            {
                return BadRequest(new { mensaje = $"Stock insuficiente de {producto.Nombre} en la sucursal actual." });
            }
        }

        var cliente = await ResolverClientePorDatosAsync(
            dto.ClienteId,
            dto.ClienteNombre,
            tipoDoc,
            dto.NumeroDocumento,
            dto.Telefono,
            dto.Correo,
            dto.Direccion);

        if (cliente is null)
        {
            return BadRequest(new { mensaje = "No se pudo resolver/crear el cliente de la cotizacion." });
        }

        var codigoCotizacion = await GenerarCodigoCotizacionAsync();
        var cotizacion = new Cotizacion
        {
            SucursalId = sucursalId,
            Codigo = codigoCotizacion,
            FechaCotizacion = DateTime.Now,
            ClienteId = cliente.ClienteId,
            EmpleadoId = empleadoId,
            Estado = "Pendiente",
        };

        // 2. CREACIÓN DEL DETALLE DINÁMICA
        decimal subtotal = 0;
        foreach (var item in items)
        {
            var producto = productos[item.ProductoId];

            int cantidadUnidadesFinal;
            decimal precioFinal;
            string tipoUnidad;

            if (sucursalId == 3) // Lógica para Sucursal 2 (Minorista)
            {
                cantidadUnidadesFinal = item.CantidadCajas;
                tipoUnidad = "Unidad";
                precioFinal = item.PrecioCaja > 0
                    ? item.PrecioCaja
                    : (producto.CostoUnidad > 0 ? producto.CostoUnidad : Math.Round(producto.PrecioProveedorCaja / Math.Max(producto.UnidadesPorCaja, 1), 2));
            }
            else // Lógica para Sucursal 1 (Mayorista - ID 2)
            {
                cantidadUnidadesFinal = item.CantidadCajas * Math.Max(producto.UnidadesPorCaja, 1);
                tipoUnidad = "Caja";
                precioFinal = item.PrecioCaja > 0 ? item.PrecioCaja : producto.PrecioProveedorCaja;
            }

            var subTotalItem = Math.Round(precioFinal * item.CantidadCajas, 2);
            subtotal += subTotalItem;

            cotizacion.Detalles.Add(new CotizacionDetalle
            {
                ProductoId = item.ProductoId,
                TipoUnidadVenta = tipoUnidad,
                Cantidad = cantidadUnidadesFinal,
                PrecioUnitario = precioFinal,
                SubTotal = subTotalItem
            });
        }

        AplicarTotalesConIgvIncluido(cotizacion, subtotal);

        _context.Cotizaciones.Add(cotizacion);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCotizaciones), new { }, MapearCotizacionListado(cotizacion, cliente));
    }

    [HttpPut("cotizaciones/{cotizacionId:long}")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<CotizacionListadoDto>> ActualizarCotizacion(long cotizacionId, [FromBody] ActualizarCotizacionCompletaDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var sucursalId = ObtenerSucursalId();

        var cotizacion = await _context.Cotizaciones
            .Include(c => c.Detalles)
            .Include(c => c.Cliente)
            .FirstOrDefaultAsync(c => c.CotizacionId == cotizacionId && c.SucursalId == sucursalId);

        if (cotizacion is null)
        {
            return NotFound(new { mensaje = "No se encontro la cotizacion." });
        }

        if (cotizacion.Estado == "Completado")
        {
            return BadRequest(new { mensaje = "No se puede editar una cotizacion completada." });
        }

        var tipoDocumento = (dto.TipoDocumento ?? string.Empty).Trim().ToUpperInvariant();
        if (!TipoDocumentoEsValido(tipoDocumento))
        {
            return BadRequest(new { mensaje = "Solo se permite tipo de documento DNI o RUC." });
        }

        var nombre = (dto.ClienteNombre ?? string.Empty).Trim();
        var numeroDocumento = (dto.NumeroDocumento ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(numeroDocumento))
        {
            return BadRequest(new { mensaje = "Nombre y numero de documento son obligatorios." });
        }

        var items = dto.Items
            .Where(i => i.CantidadCajas > 0)
            .GroupBy(i => i.ProductoId)
            .Select(g => new
            {
                ProductoId = g.Key,
                CantidadCajas = g.Sum(x => x.CantidadCajas),
                PrecioCaja = g.Last().PrecioCaja,
            })
            .ToList();

        if (items.Count == 0)
        {
            return BadRequest(new { mensaje = "Debes mantener al menos un producto en la cotizacion." });
        }

        var productoIds = items.Select(i => i.ProductoId).Distinct().ToList();
        var productos = await _context.Productos
            .AsNoTracking()
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        if (productos.Count != productoIds.Count)
        {
            return BadRequest(new { mensaje = "Hay productos que no existen en la base de datos." });
        }

        var cliente = await ResolverClientePorDatosAsync(
            cotizacion.ClienteId,
            nombre,
            tipoDocumento,
            numeroDocumento,
            dto.Telefono,
            dto.Correo,
            dto.Direccion);

        if (cliente is null)
        {
            return BadRequest(new { mensaje = "No se pudo resolver/crear el cliente de la cotizacion." });
        }

        cotizacion.ClienteId = cliente.ClienteId;

        _context.CotizacionDetalle.RemoveRange(cotizacion.Detalles);
        cotizacion.Detalles.Clear();

        decimal subtotal = 0;
        foreach (var item in items)
        {
            var producto = productos[item.ProductoId];

            int cantidadUnidadesFinal;
            decimal precioFinal;
            string tipoUnidad;

            if (sucursalId == 3) // Lógica para Sucursal 2 (Minorista)
            {
                cantidadUnidadesFinal = item.CantidadCajas;
                tipoUnidad = "Unidad";
                precioFinal = item.PrecioCaja > 0
                    ? item.PrecioCaja
                    : (producto.CostoUnidad > 0 ? producto.CostoUnidad : Math.Round(producto.PrecioProveedorCaja / Math.Max(producto.UnidadesPorCaja, 1), 2));
            }
            else // Lógica para Sucursal 1 (Mayorista - ID 2)
            {
                cantidadUnidadesFinal = item.CantidadCajas * Math.Max(producto.UnidadesPorCaja, 1);
                tipoUnidad = "Caja";
                precioFinal = item.PrecioCaja > 0 ? item.PrecioCaja : producto.PrecioProveedorCaja;
            }

            var subTotalItem = Math.Round(precioFinal * item.CantidadCajas, 2);
            subtotal += subTotalItem;

            cotizacion.Detalles.Add(new CotizacionDetalle
            {
                ProductoId = item.ProductoId,
                TipoUnidadVenta = tipoUnidad,
                Cantidad = cantidadUnidadesFinal,
                PrecioUnitario = precioFinal,
                SubTotal = subTotalItem
            });
        }

        AplicarTotalesConIgvIncluido(cotizacion, subtotal);

        await _context.SaveChangesAsync();
        return Ok(MapearCotizacionListado(cotizacion, cliente));
    }

    [HttpPost("cotizaciones/{cotizacionId:long}/facturar")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<CotizacionListadoDto>> PasarCotizacionAFactura(long cotizacionId, [FromBody] FacturarCotizacionDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var empleadoIdActual = ObtenerEmpleadoIdActual();
        var sucursalId = ObtenerSucursalId();

        var cotizacion = await _context.Cotizaciones
            .Include(c => c.Detalles)
            .Include(c => c.Cliente)
            .FirstOrDefaultAsync(c => c.CotizacionId == cotizacionId && c.SucursalId == sucursalId);

        if (cotizacion is null)
        {
            return NotFound(new { mensaje = "No se encontro la cotizacion." });
        }

        if (cotizacion.Estado == "Completado")
        {
            return BadRequest(new { mensaje = "La cotizacion ya fue facturada." });
        }

        if (!cotizacion.ClienteId.HasValue)
        {
            return BadRequest(new { mensaje = "La cotizacion no tiene cliente asociado." });
        }

        var tipoComprobante = NormalizarTipoComprobante(dto.TipoComprobante);
        if (!TiposComprobantePermitidos.Contains(tipoComprobante))
        {
            return BadRequest(new { mensaje = "Tipo de comprobante invalido. Usa Factura o Boleta." });
        }

        var metodoPago = (dto.MetodoPago ?? string.Empty).Trim();
        if (!MetodosPagoPermitidos.Contains(metodoPago))
        {
            return BadRequest(new { mensaje = "Metodo de pago invalido." });
        }

        var productoIds = cotizacion.Detalles.Select(d => d.ProductoId).Distinct().ToList();
        var inventarioSucursal = await _context.Inventario
            .Where(i => i.SucursalId == cotizacion.SucursalId && productoIds.Contains(i.ProductoId))
            .ToDictionaryAsync(i => i.ProductoId);

        foreach (var item in cotizacion.Detalles)
        {
            if (!inventarioSucursal.TryGetValue(item.ProductoId, out var inv) || inv.StockUnidades < item.Cantidad)
            {
                return BadRequest(new { mensaje = "No hay stock suficiente en la sucursal actual para facturar esta cotizacion." });
            }
        }

        var serieBoleta = (sucursalId == 3) ? "B002" : "B001";
        var serieFactura = (sucursalId == 3) ? "F002" : "F001";

        var serie = string.Equals(tipoComprobante, "Factura", StringComparison.OrdinalIgnoreCase)
            ? serieFactura
            : serieBoleta;

        var numeroComprobante = await ObtenerSiguienteNumeroComprobanteAsync(cotizacion.SucursalId, serie);

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var item in cotizacion.Detalles)
            {
                var inv = inventarioSucursal[item.ProductoId];
                inv.StockUnidades -= item.Cantidad;
            }

            var factura = new Factura
            {
                SucursalId = cotizacion.SucursalId,
                NumeroComprobante = numeroComprobante,
                FechaEmision = DateTime.Now,
                TipoComprobante = tipoComprobante,
                MetodoPago = metodoPago,
                CotizacionOrigenId = cotizacion.CotizacionId,
                ClienteId = cotizacion.ClienteId.Value,
                EmpleadoId = empleadoIdActual,
                Subtotal = cotizacion.Subtotal,
                IGV = cotizacion.IGV,
                Total = cotizacion.Total,
            };

            foreach (var item in cotizacion.Detalles)
            {
                factura.Detalles.Add(new FacturaDetalle
                {
                    ProductoId = item.ProductoId,
                    TipoUnidadVenta = item.TipoUnidadVenta,
                    Cantidad = item.Cantidad,
                    PrecioUnitarioVenta = item.PrecioUnitario,
                    SubTotal = item.SubTotal,
                });
            }

            _context.Facturas.Add(factura);
            cotizacion.Estado = "Completado";

            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return Ok(MapearCotizacionListado(cotizacion, cotizacion.Cliente));
    }

    [HttpDelete("cotizaciones/{cotizacionId:long}")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<IActionResult> EliminarCotizacion(long cotizacionId)
    {

        var sucursalId = ObtenerSucursalId();

        var cotizacion = await _context.Cotizaciones
            .Include(c => c.Detalles)
            .FirstOrDefaultAsync(c => c.CotizacionId == cotizacionId && c.SucursalId == sucursalId);

        if (cotizacion is null)
        {
            return NotFound(new { mensaje = "No se encontro la cotizacion." });
        }

        _context.Cotizaciones.Remove(cotizacion);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("facturas")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<IEnumerable<FacturaListadoDto>>> GetFacturas()
    {
        var sucursalId = ObtenerSucursalId();

        var facturas = await _context.Facturas
            .AsNoTracking()
            .Include(f => f.Cliente)
            .Where(f => f.SucursalId == sucursalId)
            .OrderByDescending(f => f.FechaEmision)
            .ThenByDescending(f => f.FacturaId)
            .Select(f => new FacturaListadoDto
            {
                FacturaId = f.FacturaId,
                Id = f.NumeroComprobante,
                Fecha = f.FechaEmision.ToString("MM/dd/yyyy"),
                TipoComprobante = f.TipoComprobante,
                Cliente = f.Cliente != null ? f.Cliente.Nombre : "Cliente",
                MetodoPago = f.MetodoPago,
                Total = f.Total,
                Estado = "Pagado",
            })
            .ToListAsync();

        return Ok(facturas);
    }

    [HttpGet("facturas/{facturaId:long}")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<FacturaDetalleDto>> GetFacturaDetalle(long facturaId)
    {

        var sucursalId = ObtenerSucursalId();

        var factura = await _context.Facturas
            .AsNoTracking()
            .Include(f => f.Cliente)
            .Include(f => f.Empleado)
            .Include(f => f.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(f => f.FacturaId == facturaId && f.SucursalId == sucursalId);

        if (factura is null)
        {
            return NotFound(new { mensaje = "No se encontro la factura." });
        }

        var (serie, numero) = SepararNumeroComprobante(factura.NumeroComprobante);
        var documento = factura.Cliente != null
            ? $"{factura.Cliente.TipoDocumento}: {factura.Cliente.NumeroDocumento}"
            : string.Empty;

        var detalle = new FacturaDetalleDto
        {
            FacturaId = factura.FacturaId,
            Id = factura.NumeroComprobante,
            Fecha = factura.FechaEmision.ToString("yyyy-MM-ddTHH:mm:ss"),
            TipoComprobante = factura.TipoComprobante,
            Serie = serie,
            Numero = numero,
            Cliente = factura.Cliente?.Nombre ?? "Cliente",
            Documento = documento,
            Telefono = factura.Cliente?.Telefono,
            Direccion = factura.Cliente?.Direccion,
            MetodoPago = factura.MetodoPago,
            Estado = "Pagado",
            Total = factura.Total,
            Vendedor = factura.Empleado?.Nombre ?? "No registrado",
            Items = factura.Detalles
                .OrderBy(d => d.FacturaDetalleId)
                .Select(d => new FacturaDetalleItemDto
                {
                    ProductoId = d.ProductoId,
                    Sku = d.Producto?.Sku ?? string.Empty,
                    Nombre = d.Producto?.Nombre ?? string.Empty,

                    CantidadCajas = (sucursalId == 3)
                        ? d.Cantidad
                        : (d.Producto != null && d.Producto.UnidadesPorCaja > 0
                            ? d.Cantidad / d.Producto.UnidadesPorCaja
                            : d.Cantidad),

                    PrecioCaja = d.PrecioUnitarioVenta,
                    SubTotal = d.SubTotal
                })
                .ToList()
        };

        return Ok(detalle);
    }


    [HttpGet("facturas/{facturaId:long}/pdf")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<IActionResult> DescargarFacturaPdf(long facturaId, CancellationToken cancellationToken)
    {
        var sucursalId = ObtenerSucursalId();

        var factura = await _context.Facturas
            .AsNoTracking()
            .Include(f => f.Cliente)
            .Include(f => f.Empleado)
            .Include(f => f.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(f => f.FacturaId == facturaId && f.SucursalId == sucursalId, cancellationToken);

        if (factura is null)
        {
            return NotFound(new { mensaje = "No se encontro la factura." });
        }

        var numeroComprobante = string.IsNullOrWhiteSpace(factura.NumeroComprobante)
            ? $"VTA-{factura.FacturaId:000000}"
            : factura.NumeroComprobante;
        var pdfBytes = _pdfService.GenerarFacturaPdf(factura);

        return File(pdfBytes, "application/pdf", $"{numeroComprobante}.pdf");
    }

    [HttpPost("facturas/{facturaId:long}/enviar-correo")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<EnviarFacturaCorreoResponseDto>> EnviarFacturaPorCorreo(long facturaId, CancellationToken cancellationToken)
    {
        var sucursalId = ObtenerSucursalId();

        try
        {
            var factura = await _context.Facturas
                .AsNoTracking()
                .Include(f => f.Cliente)
                .Include(f => f.Empleado)
                .Include(f => f.Detalles)
                    .ThenInclude(d => d.Producto)
                .FirstOrDefaultAsync(f => f.FacturaId == facturaId && f.SucursalId == sucursalId, cancellationToken);

            if (factura is null)
            {
                return NotFound(new { mensaje = "No se encontro la factura." });
            }

            var destinatario = (factura.Cliente?.Correo ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(destinatario))
            {
                return BadRequest(new { mensaje = "La factura no tiene correo de cliente asociado." });
            }

            var numeroComprobante = factura.NumeroComprobante;
            var asunto = $"Comprobante {numeroComprobante}";
            var bodyHtml = ConstruirHtmlCorreoFactura(factura, numeroComprobante);
            var pdfBytes = _pdfService.GenerarFacturaPdf(factura);

            await _emailService.EnviarCorreoConAdjuntoAsync(
                paraEmail: destinatario,
                paraNombre: factura.Cliente?.Nombre ?? "Cliente",
                asunto: asunto,
                htmlBody: bodyHtml,
                attachmentContent: pdfBytes,
                attachmentFileName: $"{numeroComprobante}.pdf",
                attachmentContentType: "application/pdf",
                cancellationToken: cancellationToken);

            return Ok(new EnviarFacturaCorreoResponseDto
            {
                Exito = true,
                Mensaje = "Factura enviada correctamente por correo.",
                Comprobante = numeroComprobante,
                Destinatario = destinatario,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al enviar factura {FacturaId} por correo.", facturaId);
            return StatusCode(500, new EnviarFacturaCorreoResponseDto
            {
                Exito = false,
                Mensaje = "Ocurrio un error al enviar el correo. Revisa logs del servidor.",
                Comprobante = string.Empty,
                Destinatario = string.Empty,
            });
        }
    }

    private static string ConstruirHtmlCorreoFactura(Factura factura, string numeroComprobante)
    {
        var nombreCliente = factura.Cliente?.Nombre ?? "Cliente";
        var tipo = string.Equals(factura.TipoComprobante, "Factura", StringComparison.OrdinalIgnoreCase)
            ? "Factura"
            : "Boleta";

        return $"""
                <div style="font-family:Arial,Helvetica,sans-serif;color:#222;">
                  <h2 style="color:#9b111e;margin:0 0 12px;">INGEMAT GALLARDO S.A.C.</h2>
                  <p style="margin:0 0 8px;">Hola <strong>{nombreCliente}</strong>,</p>
                  <p style="margin:0 0 8px;">Adjuntamos su {tipo} <strong>{numeroComprobante}</strong>.</p>
                  <p style="margin:0 0 8px;">Fecha de emision: {factura.FechaEmision:dd/MM/yyyy}</p>
                  <p style="margin:0 0 14px;">Total: <strong>S/ {factura.Total:N2}</strong></p>
                  <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;">
                  <p style="font-size:12px;color:#666;margin:0;">Mensaje generado automaticamente por el sistema de facturacion.</p>
                </div>
                """;
    }

    private async Task<Cliente?> ResolverClientePorDatosAsync(
        long? clienteId,
        string? clienteNombre,
        string? tipoDocumentoRaw,
        string? numeroDocumentoRaw,
        string? telefono,
        string? correo,
        string? direccion)
    {
        if (clienteId.HasValue)
        {
            var clienteExistente = await _context.Clientes
                .FirstOrDefaultAsync(c => c.ClienteId == clienteId.Value);

            if (clienteExistente != null)
            {
                clienteExistente.Nombre = (clienteNombre ?? clienteExistente.Nombre).Trim();
                clienteExistente.Telefono = LimpiarTexto(telefono);
                clienteExistente.Correo = LimpiarTexto(correo);
                clienteExistente.Direccion = LimpiarTexto(direccion);
                return clienteExistente;
            }
        }

        var tipoDoc = (tipoDocumentoRaw ?? "").Trim().ToUpperInvariant();
        var nroDoc = (numeroDocumentoRaw ?? string.Empty).Trim();
        var nombre = (clienteNombre ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(tipoDoc) || string.IsNullOrWhiteSpace(nroDoc))
        {
            return null;
        }

        if (!TipoDocumentoEsValido(tipoDoc))
        {
            return null;
        }

        var clientePorDocumento = await _context.Clientes
            .FirstOrDefaultAsync(c => c.NumeroDocumento == nroDoc);

        if (clientePorDocumento != null)
        {
            clientePorDocumento.TipoDocumento = tipoDoc;
            clientePorDocumento.Nombre = nombre;
            clientePorDocumento.Telefono = LimpiarTexto(telefono);
            clientePorDocumento.Correo = LimpiarTexto(correo);
            clientePorDocumento.Direccion = LimpiarTexto(direccion);
            return clientePorDocumento;
        }

        var nuevoCliente = new Cliente
        {
            TipoDocumento = tipoDoc,
            NumeroDocumento = nroDoc,
            Nombre = nombre,
            Telefono = LimpiarTexto(telefono),
            Correo = LimpiarTexto(correo),
            Direccion = LimpiarTexto(direccion),
        };

        _context.Clientes.Add(nuevoCliente);
        await _context.SaveChangesAsync();
        return nuevoCliente;
    }

    private async Task<string> GenerarCodigoCotizacionAsync()
    {
        var codigos = await _context.Cotizaciones
            .AsNoTracking()
            .Select(c => c.Codigo)
            .ToListAsync();

        var ultimo = codigos
            .Where(c => !string.IsNullOrWhiteSpace(c) && c.StartsWith("COT-", StringComparison.OrdinalIgnoreCase))
            .Select(c =>
            {
                var parte = c[4..];
                return int.TryParse(parte, out var numero) ? numero : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"COT-{(ultimo + 1):0000}";
    }

    private async Task<string> ObtenerSiguienteNumeroComprobanteAsync(int sucursalId, string serie)
    {

        var prefijo = $"{serie}-";

        var ultimos = await _context.Facturas
            .AsNoTracking()
            .Where(f => f.SucursalId == sucursalId && f.NumeroComprobante.StartsWith(prefijo))
            .Select(f => f.NumeroComprobante)
            .ToListAsync();

        var ultimoNumero = ultimos
            .Select(valor =>
            {
                var partes = valor.Split('-', 2, StringSplitOptions.TrimEntries);
                if (partes.Length != 2)
                {
                    return 0;
                }
                return int.TryParse(partes[1], out var num) ? num : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"{serie}-{(ultimoNumero + 1):00000}";
    }

    private static string? LimpiarTexto(string? valor)
    {
        var texto = valor?.Trim();
        return string.IsNullOrWhiteSpace(texto) ? null : texto;
    }

    private static ClienteListadoDto MapearClienteListado(Cliente cliente)
    {
        return new ClienteListadoDto
        {
            ClienteId = cliente.ClienteId,
            TipoDocumento = cliente.TipoDocumento,
            NumeroDocumento = cliente.NumeroDocumento,
            Nombre = cliente.Nombre,
            Telefono = cliente.Telefono,
            Correo = cliente.Correo,
            Direccion = cliente.Direccion,
        };
    }

    private static CotizacionListadoDto MapearCotizacionListado(Cotizacion cotizacion, Cliente? cliente)
    {
        return new CotizacionListadoDto
        {
            CotizacionId = cotizacion.CotizacionId,
            Id = cotizacion.Codigo,
            Fecha = cotizacion.FechaCotizacion.ToString("MM/dd/yyyy"),
            Cliente = cliente?.Nombre ?? string.Empty,
            Documento = cliente != null ? $"{cliente.TipoDocumento}: {cliente.NumeroDocumento}" : string.Empty,
            Estado = cotizacion.Estado,
            Total = cotizacion.Total,
        };
    }

    private static void AplicarTotalesConIgvIncluido(Cotizacion cotizacion, decimal totalConIgv)
    {
        var total = Math.Round(totalConIgv, 2);
        var subtotal = Math.Round(total / IgvMultiplier, 2);

        cotizacion.Subtotal = subtotal;
        cotizacion.IGV = Math.Round(total - subtotal, 2);
        cotizacion.Total = total;
    }

    private static bool TipoDocumentoEsValido(string tipoDocumento)
    {
        return TiposDocumentoPermitidos.Contains(tipoDocumento.Trim().ToUpperInvariant());
    }

    private static string NormalizarTipoComprobante(string valor)
    {
        var limpio = (valor ?? string.Empty).Trim().ToLowerInvariant();
        return limpio switch
        {
            "factura" => "Factura",
            "boleta" => "Boleta",
            _ => valor?.Trim() ?? string.Empty
        };
    }

    private static (string serie, int numero) SepararNumeroComprobante(string numeroComprobante)
    {
        if (string.IsNullOrWhiteSpace(numeroComprobante))
        {
            return (string.Empty, 0);
        }

        var partes = numeroComprobante.Split('-', 2, StringSplitOptions.TrimEntries);
        if (partes.Length != 2)
        {
            return (numeroComprobante, 0);
        }

        return (partes[0], int.TryParse(partes[1], out var num) ? num : 0);
    }
}
