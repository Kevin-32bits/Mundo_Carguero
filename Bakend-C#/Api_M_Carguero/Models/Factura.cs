using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Ventas")]
public class Factura
{
    [Key]
    [Column("Id")]
    public int FacturaId { get; set; }

    [Required]
    [Column("UbicacionId")]
    public int SucursalId { get; set; }

    [Required]
    [StringLength(50)]
    public string NumeroComprobante { get; set; } = string.Empty;

    [Column("Fecha", TypeName = "datetime")]
    public DateTime FechaEmision { get; set; } = DateTime.Now;

    [Required]
    [StringLength(20)]
    public string TipoComprobante { get; set; } = "Boleta";

    [Required]
    [StringLength(30)]
    public string MetodoPago { get; set; } = "Efectivo";

    public int? CotizacionOrigenId { get; set; }

    public int ClienteId { get; set; }

    [Required]
    public int EmpleadoId { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal IGV { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Total { get; set; }

    public Sucursal? Sucursal { get; set; }
    public Cliente? Cliente { get; set; }
    public Empleado? Empleado { get; set; }
    public Cotizacion? CotizacionOrigen { get; set; }
    public ICollection<FacturaDetalle> Detalles { get; set; } = new List<FacturaDetalle>();
}
