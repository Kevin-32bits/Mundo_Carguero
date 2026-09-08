using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class CrearProductoDto
{
    [Required]
    [StringLength(50)]
    public string Sku { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [StringLength(70)]
    public string Categoria { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Descripcion { get; set; }

    [StringLength(80)]
    public string? Proveedor { get; set; }

    [StringLength(30)]
    public string? Telefono { get; set; }

    [Range(1, int.MaxValue)]
    public int UnidadesPorCaja { get; set; }

    [Range(0, double.MaxValue)]
    public decimal PrecioVentaCaja { get; set; }

    [Range(0, double.MaxValue)]
    public decimal CostoCaja { get; set; }

    [Range(0, double.MaxValue)]
    public decimal CostoUnitario { get; set; }

    [Range(1, int.MaxValue)]
    public int StockCajasIngreso { get; set; } = 1;
}
