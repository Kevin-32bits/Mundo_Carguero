using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Transferencias")]
public class TransferenciaInventario
{
    [Key]
    [Column("Id")]
    public int TransferenciaId { get; set; }

    [Column("OrigenId")]
    public int? SucursalOrigenId { get; set; }

    [Required]
    [Column("DestinoId")]
    public int SucursalDestinoId { get; set; }

    [Column("EmpleadoSolicitanteId")]
    public int? EmpleadoSolicitanteId { get; set; }

    [Column("EmpleadoApruebaId")]
    public int? EmpleadoApruebaId { get; set; }

    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "Pendiente";

    [Column("FechaSolicitud", TypeName = "datetime")]
    public DateTime FechaSolicitud { get; set; } = DateTime.Now;

    [Column("FechaAprobacion", TypeName = "datetime")]
    public DateTime? FechaAprobacion { get; set; }

    [StringLength(50)]
    public string? TipoTransferencia { get; set; }

    public Sucursal? SucursalOrigen { get; set; }
    public Sucursal? SucursalDestino { get; set; }
    public Empleado? EmpleadoSolicitante { get; set; }
    public Empleado? EmpleadoAprueba { get; set; }
    public ICollection<TransferenciaDetalle> Detalles { get; set; } = new List<TransferenciaDetalle>();
}
