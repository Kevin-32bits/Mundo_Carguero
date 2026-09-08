using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

public class InventarioSucursal
{
    [Key]
    public long InventarioSucursalId { get; set; }

    [Required]
    public int SucursalId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Range(0, int.MaxValue)]
    public int StockUnidades { get; set; }

    [Range(0, int.MaxValue)]
    public int StockMinimo { get; set; }

    [Column(TypeName = "datetime2(0)")]
    public DateTime FechaActualizacion { get; set; } = DateTime.Now;

    public Sucursal? Sucursal { get; set; }
    public Producto? Producto { get; set; }
}

