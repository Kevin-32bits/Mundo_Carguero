using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Inventario")]
public class Inventario
{
    [Key]
    [Column("Id")]
    public int InventarioId { get; set; }

    [Required]
    public int ProductoId { get; set; }

    [Required]
    [Column("UbicacionId")]
    public int SucursalId { get; set; }

    [Required]
    [Column("Stock")]
    public int StockUnidades { get; set; }

    public Producto? Producto { get; set; }
    public Sucursal? Sucursal { get; set; }
}
