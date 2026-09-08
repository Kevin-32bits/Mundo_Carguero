using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Detalle_Cotizaciones")]
public class CotizacionDetalle
{
    [Key]
    [Column("Id")]
    public int CotizacionDetalleId { get; set; }

    [Required]
    public int CotizacionId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Required]
    [StringLength(10)]
    [Column("TipoVenta")]
    public string TipoUnidadVenta { get; set; } = "Caja";

    [Required]
    public int Cantidad { get; set; }

    [Column("PrecioAplicado", TypeName = "decimal(10,2)")]
    public decimal PrecioUnitario { get; set; }

    [Column("Subtotal", TypeName = "decimal(10,2)")]
    public decimal SubTotal { get; set; }

    public Cotizacion? Cotizacion { get; set; }
    public Producto? Producto { get; set; }
}
