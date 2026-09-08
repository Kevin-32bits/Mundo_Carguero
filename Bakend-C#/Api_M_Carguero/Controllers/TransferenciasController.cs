using Api_M_Carguero.Data;
using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;
using Api_M_Carguero.Services.Common;
using Api_M_Carguero.Services.Transferencias;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Api_M_Carguero.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TransferenciasController : ControllerBase
{
    private const string NombreAlmacen = "Almacen";
    private static readonly string[] NombresSucursal1 = { "Sucursal1", "Sucursal 1" };

    private readonly ApplicationDbContext _context;
    private readonly IApplicationClock _clock;
    private readonly ITransferenciaFacade _transferenciaFacade;

    public TransferenciasController(
        ApplicationDbContext context,
        IApplicationClock clock,
        ITransferenciaFacade transferenciaFacade)
    {
        _context = context;
        _clock = clock;
        _transferenciaFacade = transferenciaFacade;
    }

    private int ObtenerSucursalId()
    {
        var idClaim = User.FindFirst("SucursalId")?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }

    private int ObtenerEmpleadoIdActual()
    {
        var idClaim = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }

    [HttpGet] 
    [Authorize(Roles = "Almacen, Gerencia")] 
    public async Task<ActionResult<IEnumerable<TransferenciaListadoDto>>> GetTransferencias([FromQuery] string? estado = null)
    {
        var almacenId = await ObtenerIdAlmacenAsync();

        if (almacenId is null)
        {
            return Ok(Array.Empty<TransferenciaListadoDto>());
        }

        // El almacén ve TODOS los movimientos donde él participa, sin importar si vienen de la Sucursal 1, 2 o 3.
        var query = _context.TransferenciasInventario
            .AsNoTracking()
            .Include(t => t.SucursalOrigen)
            .Include(t => t.SucursalDestino)
            .Include(t => t.EmpleadoSolicitante)
            .Include(t => t.EmpleadoAprueba)
            .Include(t => t.Detalles)
            .Where(t => t.SucursalOrigenId == almacenId.Value || t.SucursalDestinoId == almacenId.Value);

        if (!string.IsNullOrWhiteSpace(estado))
        {
            var estadoNormalizado = estado.Trim();
            if (string.Equals(estadoNormalizado, "Recibido", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(t => t.Estado == "Recibido" || t.Estado == "Anulado");
            }
            else
            {
                query = query.Where(t => t.Estado == estadoNormalizado);
            }
        }

        var transferencias = await query
            .OrderByDescending(t => t.FechaSolicitud)
            .ToListAsync();

        var resultado = _transferenciaFacade.BuildListado(transferencias);
        return Ok(resultado);
    }

    [HttpGet("{transferenciaId:int}/detalle")]
    public async Task<ActionResult<IEnumerable<TransferenciaDetalleItemDto>>> GetDetalleTransferencia(int transferenciaId)
    {
        var transferenciaExiste = await _context.TransferenciasInventario
            .AsNoTracking()
            .AnyAsync(t => t.TransferenciaId == transferenciaId);

        if (!transferenciaExiste)
        {
            return NotFound(new { mensaje = "No se encontro la transferencia solicitada." });
        }

        var detalle = await _context.TransferenciaDetalle
            .AsNoTracking()
            .Include(d => d.Producto)
            .Where(d => d.TransferenciaId == transferenciaId)
            .OrderBy(d => d.TransferenciaDetalleId)
            .Select(d => new TransferenciaDetalleItemDto
            {
                TransferenciaDetalleId = d.TransferenciaDetalleId,
                ProductoId = d.ProductoId,
                Sku = d.Producto != null ? d.Producto.Sku : string.Empty,
                Descripcion = d.Producto != null ? d.Producto.Nombre : string.Empty,
                Cajas = d.Producto != null && d.Producto.UnidadesPorCaja > 0
                    ? d.CantidadUnidades / d.Producto.UnidadesPorCaja
                    : d.CantidadUnidades,
                CostoCaja = d.Producto != null ? d.Producto.PrecioProveedorCaja : d.CostoCaja
            })
            .ToListAsync();

        return Ok(detalle);
    }

    [HttpDelete("{transferenciaId:int}/detalle/{itemId:int}")]
    public async Task<IActionResult> EliminarItemDetallePorRuta(int transferenciaId, int itemId)
    {
        var transferencia = await _context.TransferenciasInventario
            .Include(t => t.Detalles)
            .FirstOrDefaultAsync(t => t.TransferenciaId == transferenciaId);

        if (transferencia is null)
        {
            return NotFound(new { mensaje = "No se encontro la transferencia indicada." });
        }

        if (!string.Equals(transferencia.Estado, "Pendiente", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { mensaje = "Solo se puede eliminar items de transferencias pendientes." });
        }

        var detalle = transferencia.Detalles.FirstOrDefault(d =>
            d.ProductoId == itemId || d.TransferenciaDetalleId == itemId);

        if (detalle is null)
        {
            return NotFound(new { mensaje = "No se encontro el item solicitado." });
        }

        _context.TransferenciaDetalle.Remove(detalle);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{transferenciaId:int}/detalle")]
    public async Task<IActionResult> EliminarItemDetallePorQuery(
        int transferenciaId,
        [FromQuery] int? productoId = null,
        [FromQuery] int? idProducto = null,
        [FromQuery] int? detalleId = null,
        [FromQuery] int? transferenciaDetalleId = null,
        [FromQuery] string? sku = null)
    {
        var transferencia = await _context.TransferenciasInventario
            .Include(t => t.Detalles)
            .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(t => t.TransferenciaId == transferenciaId);

        if (transferencia is null)
        {
            return NotFound(new { mensaje = "No se encontro la transferencia indicada." });
        }

        if (!string.Equals(transferencia.Estado, "Pendiente", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { mensaje = "Solo se puede eliminar items de transferencias pendientes." });
        }

        var productoIdFinal = productoId ?? idProducto;
        var detalleIdFinal = detalleId ?? transferenciaDetalleId;
        var skuNormalizado = (sku ?? string.Empty).Trim().ToUpperInvariant();

        var detalle = transferencia.Detalles.FirstOrDefault(d =>
            (productoIdFinal.HasValue && d.ProductoId == productoIdFinal.Value) ||
            (detalleIdFinal.HasValue && d.TransferenciaDetalleId == detalleIdFinal.Value) ||
            (!string.IsNullOrWhiteSpace(skuNormalizado) && d.Producto != null && d.Producto.Sku == skuNormalizado));

        if (detalle is null)
        {
            return NotFound(new { mensaje = "No se encontro el item solicitado." });
        }

        _context.TransferenciaDetalle.Remove(detalle);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{transferenciaId:int}/anular")]
    public async Task<IActionResult> AnularTransferencia(int transferenciaId, [FromBody] AnularTransferenciaDto? dto = null)
    {
        var transferencia = await _context.TransferenciasInventario
            .FirstOrDefaultAsync(t => t.TransferenciaId == transferenciaId);

        if (transferencia is null)
        {
            return NotFound(new { mensaje = "No se encontro la transferencia indicada." });
        }

        if (string.Equals(transferencia.Estado, "Recibido", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { mensaje = "No se puede anular una transferencia ya recibida." });
        }

        transferencia.Estado = "Anulado";
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{transferenciaId:int}/cancelar")]
    public Task<IActionResult> CancelarTransferencia(int transferenciaId, [FromBody] AnularTransferenciaDto? dto = null)
    {
        return AnularTransferencia(transferenciaId, dto);
    }

    [HttpGet("catalogo/productos")]
    public async Task<ActionResult<IEnumerable<TransferenciaCatalogoProductoDto>>> GetProductosCatalogo([FromQuery] string? busqueda = null)
    {
        var termino = busqueda?.Trim() ?? string.Empty;
        var productosQuery = _context.Productos.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(termino))
        {
            productosQuery = productosQuery.Where(p =>
                p.Sku.Contains(termino) || p.Nombre.Contains(termino));
        }

        var productos = await productosQuery
            .OrderBy(p => p.Nombre)
            .Take(25)
            .Select(p => new TransferenciaCatalogoProductoDto
            {
                ProductoId = p.Id,
                Sku = p.Sku,
                Nombre = p.Nombre,
                UnidadesPorCaja = p.UnidadesPorCaja,
                PrecioVentaCaja = p.PrecioProveedorCaja,
                PrecioCaja = p.PrecioProveedorCaja
            })
            .ToListAsync();

        return Ok(productos);
    }

    [HttpGet("catalogo/empleados-almacen")]
    public async Task<ActionResult<IEnumerable<TransferenciaCatalogoEmpleadoDto>>> GetEmpleadosAlmacen()
    {
        var almacenId = await ObtenerIdAlmacenAsync();
        if (almacenId is null)
        {
            return Ok(Array.Empty<TransferenciaCatalogoEmpleadoDto>());
        }

        var empleados = await _context.Empleados
            .AsNoTracking()
            .Where(e => e.Activo && e.SucursalId == almacenId.Value)
            .OrderBy(e => e.Nombre)
            .Select(e => new TransferenciaCatalogoEmpleadoDto
            {
                EmpleadoId = e.EmpleadoId,
                Nombre = e.Nombre
            })
            .ToListAsync();

        return Ok(empleados);
    }

    [HttpGet("catalogo/empleados-sucursal")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<TransferenciaCatalogoEmpleadoDto>>> GetEmpleadosMiSucursal()
    {

        var miSucursalId = ObtenerSucursalId(); 
        if (miSucursalId == 0) return Ok(Array.Empty<TransferenciaCatalogoEmpleadoDto>());

        var empleados = await _context.Empleados
            .AsNoTracking()
            .Where(e => e.Activo && e.SucursalId == miSucursalId)
            .OrderBy(e => e.Nombre)
            .Select(e => new TransferenciaCatalogoEmpleadoDto
            {
                EmpleadoId = e.EmpleadoId,
                Nombre = e.Nombre
            })
            .ToListAsync();

        return Ok(empleados);
    }

    [HttpGet("stock")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<StockSucursalDto>>> GetStockActual()
    {

        var sucursalId = ObtenerSucursalId();

        if (sucursalId == 0)
        {
            return Unauthorized(new { mensaje = "El token no contiene una sucursal válida." });
        }

        var listado = await _context.Inventario
            .AsNoTracking()
            .Include(i => i.Producto)
                .ThenInclude(p => p!.Categoria)
            .Where(i => i.SucursalId == sucursalId)
            .OrderBy(i => i.Producto!.Nombre)
            .Select(i => new StockSucursalDto
            {
                ProductoId = i.ProductoId,
                Id = i.Producto!.Sku,
                Nombre = i.Producto.Nombre,
                Categoria = i.Producto.Categoria != null ? i.Producto.Categoria.Nombre : "Sin categoria",
                UnidadesPorCaja = i.Producto.UnidadesPorCaja,
                PrecioCaja = i.Producto.PrecioProveedorCaja,
                StockCajas = (sucursalId == 3)
                    ? i.StockUnidades
                    : (i.Producto.UnidadesPorCaja > 0
                        ? i.StockUnidades / i.Producto.UnidadesPorCaja 
                        : i.StockUnidades)

            })
            .ToListAsync();

        return Ok(listado);
    }

    [HttpPost("reposicion")]
    [Authorize(Roles = "Almacen, Gerencia")]
    public async Task<ActionResult<TransferenciaListadoDto>> CrearReposicionAlmacen([FromBody] CrearTransferenciaDto dto)
    {

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var empleadoId = ObtenerEmpleadoIdActual();
        if (empleadoId == 0) return Unauthorized(new { mensaje = "Token inválido." });

        var almacenId = await ObtenerIdAlmacenAsync();
        if (almacenId is null) return BadRequest(new { mensaje = "No se encontró el Almacén." });

        if (dto.SucursalDestinoId <= 0) return BadRequest(new { mensaje = "Debes especificar la sucursal de destino." });

        var empleado = await _context.Empleados
            .AsNoTracking()
            .FirstOrDefaultAsync(e =>
                e.EmpleadoId == empleadoId &&
                e.Activo &&
                e.SucursalId == almacenId.Value);

        if (empleado is null)
        {
            return BadRequest(new { mensaje = "El responsable no pertenece a Almacen o no existe." });
        }

        var detallesAgrupados = dto.Detalles
            .Where(d => d.Cajas > 0)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cajas = g.Sum(x => x.Cajas) })
            .ToList();

        if (detallesAgrupados.Count == 0)
        {
            return BadRequest(new { mensaje = "Debes enviar al menos un producto con cajas mayores a 0." });
        }

        var productos = await _context.Productos
            .AsNoTracking()
            .Where(p => detallesAgrupados.Select(d => d.ProductoId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var transferencia = new TransferenciaInventario
        {
            SucursalOrigenId = almacenId.Value,
            SucursalDestinoId = dto.SucursalDestinoId,
            EmpleadoSolicitanteId = empleado.EmpleadoId,
            Estado = "Pendiente",
            FechaSolicitud = _clock.Now,
            TipoTransferencia = "Reposicion_Directa"
        };

        foreach (var item in detallesAgrupados)
        {
            if (!productos.TryGetValue(item.ProductoId, out var prod))
            {
                return BadRequest(new { mensaje = $"ProductoId {item.ProductoId} no existe." });
            }

            var unidadesPorCaja = Math.Max(prod.UnidadesPorCaja, 1);
            var cantidadUnidades = item.Cajas * unidadesPorCaja;
            var precioCaja = prod.PrecioProveedorCaja;
            var subtotal = Math.Round(item.Cajas * precioCaja, 2);

            transferencia.Detalles.Add(new TransferenciaDetalle
            {
                ProductoId = item.ProductoId,
                CantidadUnidades = cantidadUnidades,
                CostoCaja = precioCaja,
                Subtotal = subtotal,
                Total = subtotal
            });
        }

        _context.TransferenciasInventario.Add(transferencia);
        await _context.SaveChangesAsync();

        transferencia.SucursalOrigen = new Sucursal { Nombre = "Almacen" };
        transferencia.SucursalDestino = new Sucursal { Nombre = "Sucursal 1" };
        transferencia.EmpleadoSolicitante = empleado;
        var respuesta = _transferenciaFacade.BuildListado(transferencia);

        return Ok(_transferenciaFacade.BuildListado(transferencia));
    }

    [HttpPost("solicitud")]
    [Authorize(Roles = "Sucursal1, Sucursal2")]
    public async Task<ActionResult<TransferenciaListadoDto>> CrearSolicitudSucursal([FromBody] CrearTransferenciaDto dto)

    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var miSucursalId = ObtenerSucursalId();
        var empleadoId = ObtenerEmpleadoIdActual();

        if (miSucursalId == 0 || empleadoId == 0) return Unauthorized(new { mensaje = "Token inválido." });

        var almacenId = await ObtenerIdAlmacenAsync();

        if (almacenId is null)
        {
            return BadRequest(new { mensaje = "No se encontró el Almacén base." });
        }

        var empleado = await _context.Empleados
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmpleadoId == empleadoId && e.Activo && e.SucursalId == miSucursalId);

        if (empleado is null) return BadRequest(new { mensaje = "Usuario inactivo o no pertenece a esta sucursal." });

        var detallesAgrupados = dto.Detalles
            .Where(d => d.Cajas > 0)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cajas = g.Sum(x => x.Cajas) })
            .ToList();

        if (detallesAgrupados.Count == 0)
        {
            return BadRequest(new { mensaje = "Debes enviar al menos un producto con cajas mayores a 0." });
        }

        var productos = await _context.Productos
            .AsNoTracking()
            .Where(p => detallesAgrupados.Select(d => d.ProductoId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var transferencia = new TransferenciaInventario
        {
            SucursalOrigenId = miSucursalId,
            SucursalDestinoId = almacenId.Value,
            EmpleadoSolicitanteId = empleado.EmpleadoId,
            Estado = "Pendiente",
            FechaSolicitud = _clock.Now,
            TipoTransferencia = "Solicitud_Sucursal"
        };

        foreach (var item in detallesAgrupados)
        {
            if (!productos.TryGetValue(item.ProductoId, out var prod))
            {
                return BadRequest(new { mensaje = $"ProductoId {item.ProductoId} no existe." });
            }

            var unidadesPorCaja = Math.Max(prod.UnidadesPorCaja, 1);
            var cantidadUnidades = item.Cajas * unidadesPorCaja;
            var precioCaja = prod.PrecioProveedorCaja;
            var subtotal = Math.Round(item.Cajas * precioCaja, 2);

            transferencia.Detalles.Add(new TransferenciaDetalle
            {
                ProductoId = item.ProductoId,
                CantidadUnidades = cantidadUnidades,
                CostoCaja = precioCaja,
                Subtotal = subtotal,
                Total = subtotal
            });
        }

        _context.TransferenciasInventario.Add(transferencia);
        await _context.SaveChangesAsync();

        transferencia.SucursalOrigen = new Sucursal { Nombre = "Sucursal 1" };
        transferencia.SucursalDestino = new Sucursal { Nombre = "Almacen" };
        transferencia.EmpleadoSolicitante = empleado;
        var respuesta = _transferenciaFacade.BuildListado(transferencia);

        return Ok(_transferenciaFacade.BuildListado(transferencia));
    }

    [HttpPost("{transferenciaId:int}/enviar")]
    public async Task<ActionResult<TransferenciaListadoDto>> ConfirmarEnvioTransferencia(
        int transferenciaId,
        [FromBody] AprobarTransferenciaDto? dto)
    {
        var transferencia = await _context.TransferenciasInventario
            .Include(t => t.SucursalOrigen)
            .Include(t => t.SucursalDestino)
            .Include(t => t.EmpleadoSolicitante)
            .Include(t => t.EmpleadoAprueba)
            .Include(t => t.Detalles)
            .FirstOrDefaultAsync(t => t.TransferenciaId == transferenciaId);

        if (transferencia is null)
        {
            return NotFound(new { mensaje = "No se encontro la transferencia indicada." });
        }

        if (transferencia.Estado == "Recibido")
        {
            return Ok(_transferenciaFacade.BuildListado(transferencia));
        }

        if (transferencia.Estado == "Anulado")
        {
            return BadRequest(new { mensaje = "No se puede enviar una transferencia anulada." });
        }

        if (transferencia.Detalles.Count == 0)
        {
            return BadRequest(new { mensaje = "La transferencia no tiene productos en el detalle." });
        }

        if (!transferencia.SucursalOrigenId.HasValue)
        {
            return BadRequest(new { mensaje = "La transferencia no tiene ubicacion origen definida." });
        }

        var almacenId = await ObtenerIdAlmacenAsync();
        if (almacenId is null)
        {
            return BadRequest(new { mensaje = "No se encontro la ubicacion Almacen." });
        }

        // Extracción segura del ID del aprobador desde el token JWT
        var idClaim = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out int aprobadorSeguroId))
        {
            return Unauthorized(new { mensaje = "El token es inválido o no contiene el ID del usuario." });
        }

        var empleadoAprueba = await _context.Empleados
            .AsNoTracking()
            .FirstOrDefaultAsync(e =>
                e.EmpleadoId == aprobadorSeguroId &&
                e.Activo &&
                e.SucursalId == almacenId.Value);

        if (empleadoAprueba is null)
        {
            return BadRequest(new { mensaje = "El empleado que aprueba debe pertenecer a Almacen y estar activo." });
        }

        var productoIds = transferencia.Detalles.Select(d => d.ProductoId).Distinct().ToList();

        var productos = await _context.Productos
            .AsNoTracking()
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var inventarioOrigenUbicacionId = transferencia.SucursalOrigenId.Value;
        var inventarioDestinoUbicacionId = transferencia.SucursalDestinoId;

        if (string.Equals(transferencia.TipoTransferencia, "Solicitud_Sucursal", StringComparison.OrdinalIgnoreCase) &&
            transferencia.SucursalDestinoId == almacenId.Value)
        {
            inventarioOrigenUbicacionId = almacenId.Value;
            inventarioDestinoUbicacionId = transferencia.SucursalOrigenId.Value;
        }

        var inventarioOrigen = await _context.Inventario
            .Where(i => i.SucursalId == inventarioOrigenUbicacionId && productoIds.Contains(i.ProductoId))
            .ToDictionaryAsync(i => i.ProductoId);

        var inventarioDestino = await _context.Inventario
            .Where(i => i.SucursalId == inventarioDestinoUbicacionId && productoIds.Contains(i.ProductoId))
            .ToDictionaryAsync(i => i.ProductoId);

        foreach (var detalle in transferencia.Detalles)
        {
            if (!inventarioOrigen.TryGetValue(detalle.ProductoId, out var invOrigen))
            {
                return BadRequest(new { mensaje = $"No hay inventario origen para el producto {detalle.ProductoId}." });
            }

            if (invOrigen.StockUnidades < detalle.CantidadUnidades)
            {
                var sku = productos.TryGetValue(detalle.ProductoId, out var p) ? p.Sku : detalle.ProductoId.ToString();
                return BadRequest(new { mensaje = $"Stock insuficiente en almacen para el producto {sku}." });
            }
        }

        await using var tx = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var detalle in transferencia.Detalles)
            {
                var invOrigen = inventarioOrigen[detalle.ProductoId];
                invOrigen.StockUnidades -= detalle.CantidadUnidades;

                if (inventarioDestino.TryGetValue(detalle.ProductoId, out var invDestino))
                {
                    invDestino.StockUnidades += detalle.CantidadUnidades;
                }
                else
                {
                    invDestino = new Inventario
                    {
                        SucursalId = inventarioDestinoUbicacionId,
                        ProductoId = detalle.ProductoId,
                        StockUnidades = detalle.CantidadUnidades
                    };
                    _context.Inventario.Add(invDestino);
                    inventarioDestino[detalle.ProductoId] = invDestino;
                }
            }

            transferencia.Estado = "Recibido";
            transferencia.EmpleadoApruebaId = empleadoAprueba.EmpleadoId;
            transferencia.FechaAprobacion = _clock.Now;
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        transferencia.EmpleadoAprueba = empleadoAprueba;
        return Ok(_transferenciaFacade.BuildListado(transferencia));
    }

    private async Task<int?> ObtenerIdAlmacenAsync()
    {
        return await _context.Sucursales
            .AsNoTracking()
            .Where(s => s.Nombre == NombreAlmacen)
            .OrderBy(s => s.SucursalId)
            .Select(s => (int?)s.SucursalId)
            .FirstOrDefaultAsync();
    }

}
