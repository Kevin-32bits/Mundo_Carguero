using Api_M_Carguero.Models;
using Microsoft.EntityFrameworkCore;

namespace Api_M_Carguero.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Inventario> Inventario => Set<Inventario>();
    public DbSet<TransferenciaInventario> TransferenciasInventario => Set<TransferenciaInventario>();
    public DbSet<TransferenciaDetalle> TransferenciaDetalle => Set<TransferenciaDetalle>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Cotizacion> Cotizaciones => Set<Cotizacion>();
    public DbSet<CotizacionDetalle> CotizacionDetalle => Set<CotizacionDetalle>();
    public DbSet<Factura> Facturas => Set<Factura>();
    public DbSet<FacturaDetalle> FacturaDetalle => Set<FacturaDetalle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Categoria>(entity =>
        {
            entity.HasKey(c => c.CategoriaId);
            entity.HasIndex(c => c.Nombre).IsUnique(false);
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Sku).IsUnique();
            entity.Property(p => p.PrecioProveedorCaja).HasColumnType("decimal(10,2)");
            entity.Property(p => p.CostoCaja).HasColumnType("decimal(10,2)");
            entity.Property(p => p.CostoUnidad).HasColumnType("decimal(10,2)");

            entity.HasOne(p => p.Categoria)
                .WithMany(c => c.Productos)
                .HasForeignKey(p => p.CategoriaId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Sucursal>(entity =>
        {
            entity.HasKey(s => s.SucursalId);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.HasKey(r => r.RolId);
            entity.HasIndex(r => r.NombreRol).IsUnique();
        });


        modelBuilder.Entity<Empleado>(entity =>
        {
            entity.HasKey(e => e.EmpleadoId);
            entity.HasIndex(e => e.Dni).IsUnique();
            entity.HasOne(e => e.Rol)
                .WithMany()
                .HasForeignKey(e => e.RolId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Sucursal)
                .WithMany()
                .HasForeignKey(e => e.SucursalId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Inventario>(entity =>
        {
            entity.HasKey(i => i.InventarioId);
            entity.HasIndex(i => new { i.ProductoId, i.SucursalId }).IsUnique();
            entity.Property(i => i.StockUnidades).HasColumnName("Stock");

            entity.HasOne(i => i.Producto)
                .WithMany()
                .HasForeignKey(i => i.ProductoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Sucursal)
                .WithMany()
                .HasForeignKey(i => i.SucursalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TransferenciaInventario>(entity =>
        {
            entity.HasKey(t => t.TransferenciaId);

            entity.HasOne(t => t.SucursalOrigen)
                .WithMany()
                .HasForeignKey(t => t.SucursalOrigenId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(t => t.SucursalDestino)
                .WithMany()
                .HasForeignKey(t => t.SucursalDestinoId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(t => t.EmpleadoSolicitante)
                .WithMany()
                .HasForeignKey(t => t.EmpleadoSolicitanteId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(t => t.EmpleadoAprueba)
                .WithMany()
                .HasForeignKey(t => t.EmpleadoApruebaId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<TransferenciaDetalle>(entity =>
        {
            entity.HasKey(d => d.TransferenciaDetalleId);
            entity.Property(d => d.CostoCaja).HasColumnType("decimal(10,2)");
            entity.Property(d => d.Subtotal).HasColumnType("decimal(10,2)");
            entity.Property(d => d.Total).HasColumnType("decimal(10,2)");

            entity.HasOne(d => d.Transferencia)
                .WithMany(t => t.Detalles)
                .HasForeignKey(d => d.TransferenciaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Producto)
                .WithMany()
                .HasForeignKey(d => d.ProductoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.HasKey(c => c.ClienteId);
            entity.HasIndex(c => c.NumeroDocumento).IsUnique();
            entity.HasIndex(c => new { c.TipoDocumento, c.NumeroDocumento });
        });

        modelBuilder.Entity<Cotizacion>(entity =>
        {
            entity.HasKey(c => c.CotizacionId);
            entity.HasIndex(c => c.Codigo).IsUnique();
            entity.Property(c => c.Subtotal).HasColumnType("decimal(10,2)");
            entity.Property(c => c.IGV).HasColumnType("decimal(10,2)");
            entity.Property(c => c.Total).HasColumnType("decimal(10,2)");

            entity.HasOne(c => c.Sucursal)
                .WithMany()
                .HasForeignKey(c => c.SucursalId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.Cliente)
                .WithMany(c => c.Cotizaciones)
                .HasForeignKey(c => c.ClienteId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.Empleado)
                .WithMany()
                .HasForeignKey(c => c.EmpleadoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CotizacionDetalle>(entity =>
        {
            entity.HasKey(d => d.CotizacionDetalleId);
            entity.Property(d => d.PrecioUnitario).HasColumnType("decimal(10,2)");
            entity.Property(d => d.SubTotal).HasColumnType("decimal(10,2)");

            entity.HasOne(d => d.Cotizacion)
                .WithMany(c => c.Detalles)
                .HasForeignKey(d => d.CotizacionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Producto)
                .WithMany()
                .HasForeignKey(d => d.ProductoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Factura>(entity =>
        {
            entity.HasKey(f => f.FacturaId);
            entity.HasIndex(f => f.NumeroComprobante).IsUnique();
            entity.Property(f => f.Subtotal).HasColumnType("decimal(10,2)");
            entity.Property(f => f.IGV).HasColumnType("decimal(10,2)");
            entity.Property(f => f.Total).HasColumnType("decimal(10,2)");

            entity.HasOne(f => f.Sucursal)
                .WithMany()
                .HasForeignKey(f => f.SucursalId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.Cliente)
                .WithMany()
                .HasForeignKey(f => f.ClienteId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.Empleado)
                .WithMany()
                .HasForeignKey(f => f.EmpleadoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(f => f.CotizacionOrigen)
                .WithMany()
                .HasForeignKey(f => f.CotizacionOrigenId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FacturaDetalle>(entity =>
        {
            entity.HasKey(d => d.FacturaDetalleId);
            entity.Property(d => d.PrecioUnitarioVenta).HasColumnType("decimal(10,2)");
            entity.Property(d => d.SubTotal).HasColumnType("decimal(10,2)");

            entity.HasOne(d => d.Factura)
                .WithMany(f => f.Detalles)
                .HasForeignKey(d => d.FacturaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Producto)
                .WithMany()
                .HasForeignKey(d => d.ProductoId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}

