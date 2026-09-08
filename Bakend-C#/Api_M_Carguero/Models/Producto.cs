using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Productos")]
public class Producto
{
    [Key]
    [Column("Id")]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    [Column("SKU")]
    public string Sku { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    public int CategoriaId { get; set; }

    public string? Descripcion { get; set; }

    [StringLength(150)]
    [Column("EmpresaProveedora")]
    public string? Proveedor { get; set; }

    [StringLength(20)]
    [Column("TelefonoProveedor")]
    public string? Telefono { get; set; }

    [StringLength(50)]
    public string Presentacion { get; set; } = "Caja";

    [Range(1, int.MaxValue)]
    public int UnidadesPorCaja { get; set; }

    [Column("PrecioVentaCaja", TypeName = "decimal(10,2)")]
    public decimal PrecioProveedorCaja { get; set; }

    [Column("CostoCajaProveedor", TypeName = "decimal(10,2)")]
    public decimal CostoCaja { get; set; }

    [Column("PrecioVentaUnitario", TypeName = "decimal(10,2)")]
    public decimal CostoUnidad { get; set; }

    public Categoria? Categoria { get; set; }
}
