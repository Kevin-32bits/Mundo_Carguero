using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Cotizaciones")]
public class Cotizacion
{
    [Key]
    [Column("Id")]
    public int CotizacionId { get; set; }

    [Required]
    [Column("UbicacionId")]
    public int SucursalId { get; set; }

    [Required]
    [StringLength(20)]
    [Column("NumeroCotizacion")]
    public string Codigo { get; set; } = string.Empty;

    [Column("Fecha", TypeName = "datetime")]
    public DateTime FechaCotizacion { get; set; } = DateTime.Now;

    public int? ClienteId { get; set; }

    [Required]
    public int EmpleadoId { get; set; }

    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "Pendiente";

    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal IGV { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Total { get; set; }

    public Sucursal? Sucursal { get; set; }
    public Cliente? Cliente { get; set; }
    public Empleado? Empleado { get; set; }
    public ICollection<CotizacionDetalle> Detalles { get; set; } = new List<CotizacionDetalle>();
}
