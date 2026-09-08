using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

public class InventarioCentral
{
    [Key]
    public long InventarioCentralId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Range(0, int.MaxValue)]
    public int StockUnidades { get; set; }

    [Column(TypeName = "datetime2(0)")]
    public DateTime FechaActualizacion { get; set; } = DateTime.Now;

    public Producto? Producto { get; set; }
}
