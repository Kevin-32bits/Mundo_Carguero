using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Detalle_Transferencias")]
public class TransferenciaDetalle
{
    [Key]
    [Column("Id")]
    public int TransferenciaDetalleId { get; set; }

    [Required]
    public int TransferenciaId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Range(1, int.MaxValue)]
    public int CantidadUnidades { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal CostoCaja { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Total { get; set; }

    public TransferenciaInventario? Transferencia { get; set; }
    public Producto? Producto { get; set; }
}
