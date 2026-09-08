using Api_M_Carguero.Data;
using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace Api_M_Carguero.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProductosController : ControllerBase
{
    private const string NombreUbicacionAlmacen = "Almacen";
    private readonly ApplicationDbContext _context;

    public ProductosController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductoApiDto>>> GetProductos()
    {
        var productos = await _context.Productos
            .AsNoTracking()
            .Include(p => p.Categoria)
            .OrderBy(p => p.Id)
            .ToListAsync();

        var almacenId = await ObtenerIdAlmacenAsync();
        var inventario = almacenId is null
            ? new Dictionary<int, int>()
            : await _context.Inventario
                .AsNoTracking()
                .Where(i => i.SucursalId == almacenId.Value)
                .ToDictionaryAsync(i => i.ProductoId, i => i.StockUnidades);

        return Ok(productos.Select(p => MapearProductoApi(p, ObtenerStockCajas(p, inventario))).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductoApiDto>> GetProducto(int id)
    {
        var producto = await _context.Productos
            .AsNoTracking()
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (producto is null)
        {
            return NotFound(new { mensaje = $"No existe un producto con Id {id}." });
        }

        var almacenId = await ObtenerIdAlmacenAsync();
        var stockUnidades = almacenId is null
            ? 0
            : await _context.Inventario
                .AsNoTracking()
                .Where(i => i.ProductoId == id && i.SucursalId == almacenId.Value)
                .Select(i => i.StockUnidades)
                .FirstOrDefaultAsync();

        return Ok(MapearProductoApi(producto, ObtenerStockCajas(producto, stockUnidades)));
    }

    [HttpGet("sku/{sku}")]
    public async Task<ActionResult<ProductoApiDto>> GetProductoPorSku(string sku)
    {
        var skuNormalizado = NormalizarSku(sku);

        var producto = await _context.Productos
            .AsNoTracking()
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Sku == skuNormalizado);

        if (producto is null)
        {
            return NotFound(new { mensaje = $"No existe un producto con SKU {sku}." });
        }

        var almacenId = await ObtenerIdAlmacenAsync();
        var stockUnidades = almacenId is null
            ? 0
            : await _context.Inventario
                .AsNoTracking()
                .Where(i => i.ProductoId == producto.Id && i.SucursalId == almacenId.Value)
                .Select(i => i.StockUnidades)
                .FirstOrDefaultAsync();

        return Ok(MapearProductoApi(producto, ObtenerStockCajas(producto, stockUnidades)));
    }

    [HttpPost]
    [Authorize(Roles = "Gerencia,Almacen")]
    public async Task<ActionResult<ProductoApiDto>> PostProducto(CrearProductoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var almacenId = await ObtenerIdAlmacenAsync();
        if (almacenId is null)
        {
            return BadRequest(new { mensaje = "No se encontro la ubicacion Almacen en la base de datos." });
        }

        var skuNormalizado = NormalizarSku(dto.Sku);
        var existente = await _context.Productos
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Sku == skuNormalizado);

        if (existente is not null)
        {
            var inventarioExistente = await ObtenerOCrearInventarioAsync(existente.Id, almacenId.Value);
            var cajasIngreso = Math.Max(dto.StockCajasIngreso, 1);
            inventarioExistente.StockUnidades += cajasIngreso * Math.Max(existente.UnidadesPorCaja, 1);

            await _context.SaveChangesAsync();
            return Ok(MapearProductoApi(existente, ObtenerStockCajas(existente, inventarioExistente.StockUnidades)));
        }

        var categoria = await ObtenerOCrearCategoriaAsync(dto.Categoria);
        var costoUnitarioCalculado = dto.UnidadesPorCaja > 0
            ? Math.Round(dto.CostoCaja / dto.UnidadesPorCaja, 2)
            : dto.CostoUnitario;

        var producto = new Producto
        {
            Sku = skuNormalizado,
            Nombre = dto.Nombre.Trim(),
            CategoriaId = categoria.CategoriaId,
            Descripcion = LimpiarTexto(dto.Descripcion),
            Proveedor = LimpiarTexto(dto.Proveedor),
            Telefono = LimpiarTexto(dto.Telefono),
            Presentacion = "Caja",
            UnidadesPorCaja = dto.UnidadesPorCaja,
            PrecioProveedorCaja = dto.PrecioVentaCaja,
            CostoCaja = dto.CostoCaja,
            CostoUnidad = dto.CostoUnitario > 0 ? dto.CostoUnitario : costoUnitarioCalculado,
        };

        _context.Productos.Add(producto);
        await _context.SaveChangesAsync();

        var stockUnidades = Math.Max(dto.StockCajasIngreso, 1) * Math.Max(producto.UnidadesPorCaja, 1);
        _context.Inventario.Add(new Inventario
        {
            ProductoId = producto.Id,
            SucursalId = almacenId.Value,
            StockUnidades = stockUnidades
        });

        await _context.SaveChangesAsync();

        producto.Categoria = categoria;
        return CreatedAtAction(
            nameof(GetProducto),
            new { id = producto.Id },
            MapearProductoApi(producto, ObtenerStockCajas(producto, stockUnidades))
        );
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Gerencia,Almacen")]
    public async Task<IActionResult> PutProducto(int id, ActualizarProductoDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var producto = await _context.Productos
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (producto is null)
        {
            return NotFound(new { mensaje = $"No existe un producto con Id {id}." });
        }

        var almacenId = await ObtenerIdAlmacenAsync();
        if (almacenId is null)
        {
            return BadRequest(new { mensaje = "No se encontro la ubicacion Almacen en la base de datos." });
        }

        var categoria = await ObtenerOCrearCategoriaAsync(dto.Categoria);

        producto.Nombre = dto.Nombre.Trim();
        producto.CategoriaId = categoria.CategoriaId;
        producto.Descripcion = LimpiarTexto(dto.Descripcion);
        producto.Proveedor = LimpiarTexto(dto.Proveedor);
        producto.Telefono = LimpiarTexto(dto.Telefono);
        producto.UnidadesPorCaja = dto.UnidadesPorCaja;
        producto.PrecioProveedorCaja = dto.PrecioVentaCaja;
        producto.CostoCaja = dto.CostoCaja;
        producto.CostoUnidad = dto.CostoUnitario > 0
            ? dto.CostoUnitario
            : Math.Round(dto.CostoCaja / Math.Max(dto.UnidadesPorCaja, 1), 2);

        var inventario = await ObtenerOCrearInventarioAsync(producto.Id, almacenId.Value);
        inventario.StockUnidades = Math.Max(dto.StockCajas, 0) * Math.Max(dto.UnidadesPorCaja, 1);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Gerencia,Almacen")]
    public async Task<IActionResult> DeleteProducto(int id)
    {
        var producto = await _context.Productos.FindAsync(id);
        if (producto is null)
        {
            return NotFound(new { mensaje = $"No existe un producto con Id {id}." });
        }

        var inventarios = await _context.Inventario
            .Where(i => i.ProductoId == id)
            .ToListAsync();

        if (inventarios.Count > 0)
        {
            _context.Inventario.RemoveRange(inventarios);
        }

        _context.Productos.Remove(producto);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static ProductoApiDto MapearProductoApi(Producto producto, int stockCajas)
    {
        return new ProductoApiDto
        {
            Id = producto.Id,
            Sku = producto.Sku,
            Nombre = producto.Nombre,
            Categoria = producto.Categoria?.Nombre ?? string.Empty,
            Descripcion = producto.Descripcion,
            Proveedor = producto.Proveedor,
            Telefono = producto.Telefono,
            UnidadesPorCaja = producto.UnidadesPorCaja,
            PrecioVentaCaja = producto.PrecioProveedorCaja,
            CostoCaja = producto.CostoCaja,
            CostoUnitario = producto.CostoUnidad,
            StockCajas = stockCajas,
            FechaRegistro = DateTime.Now
        };
    }

    private static string NormalizarSku(string sku)
    {
        return sku.Trim().ToUpperInvariant();
    }

    private static string? LimpiarTexto(string? valor)
    {
        var texto = valor?.Trim();
        return string.IsNullOrWhiteSpace(texto) ? null : texto;
    }

    private static int ObtenerStockCajas(Producto producto, Dictionary<int, int> inventario)
    {
        if (!inventario.TryGetValue(producto.Id, out var stockUnidades))
        {
            return 0;
        }

        return ObtenerStockCajas(producto, stockUnidades);
    }

    private static int ObtenerStockCajas(Producto producto, int stockUnidades)
    {
        if (producto.UnidadesPorCaja <= 0)
        {
            return 0;
        }

        return Math.Max(stockUnidades, 0) / producto.UnidadesPorCaja;
    }

    private async Task<int?> ObtenerIdAlmacenAsync()
    {
        return await _context.Sucursales
            .AsNoTracking()
            .Where(s => s.Nombre == NombreUbicacionAlmacen)
            .OrderBy(s => s.SucursalId)
            .Select(s => (int?)s.SucursalId)
            .FirstOrDefaultAsync();
    }

    private async Task<Categoria> ObtenerOCrearCategoriaAsync(string nombreCategoria)
    {
        var nombre = nombreCategoria.Trim();

        var categoria = await _context.Categorias
            .FirstOrDefaultAsync(c => c.Nombre == nombre);

        if (categoria is not null)
        {
            return categoria;
        }

        categoria = new Categoria
        {
            Nombre = nombre
        };

        _context.Categorias.Add(categoria);
        await _context.SaveChangesAsync();
        return categoria;
    }

    private async Task<Inventario> ObtenerOCrearInventarioAsync(int productoId, int ubicacionId)
    {
        var inventario = await _context.Inventario
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.SucursalId == ubicacionId);

        if (inventario is not null)
        {
            return inventario;
        }

        inventario = new Inventario
        {
            ProductoId = productoId,
            SucursalId = ubicacionId,
            StockUnidades = 0
        };

        _context.Inventario.Add(inventario);
        await _context.SaveChangesAsync();
        return inventario;
    }

}
