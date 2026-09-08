using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Detalle_Ventas")]
public class FacturaDetalle
{
    [Key]
    [Column("Id")]
    public int FacturaDetalleId { get; set; }

    [Required]
    [Column("VentaId")]
    public int FacturaId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Required]
    [StringLength(10)]
    [Column("TipoVenta")]
    public string TipoUnidadVenta { get; set; } = "Caja";

    [Required]
    public int Cantidad { get; set; }

    [Column("PrecioAplicado", TypeName = "decimal(10,2)")]
    public decimal PrecioUnitarioVenta { get; set; }

    [Column("Subtotal", TypeName = "decimal(10,2)")]
    public decimal SubTotal { get; set; }

    public Factura? Factura { get; set; }
    public Producto? Producto { get; set; }
}
