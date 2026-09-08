using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Empleados")]
public class Empleado
{
    [Key]
    [Column("Id")]
    public int EmpleadoId { get; set; }

    [Required]
    [StringLength(150)]
    [Column("NombreCompleto")]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    [StringLength(15)]
    [Column("DNI")]
    public string Dni { get; set; } = string.Empty;

    [StringLength(10)]
    public string? Telefono { get; set; }

    [Column("RolId")]
    public int? RolId { get; set; }

    [Required]
    [Column("UbicacionId")]
    public int SucursalId { get; set; }

    [Required]
    [StringLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [Required]
    public string Contrasena { get; set; } = string.Empty;

    [Column("EstadoLaboral")]
    public bool Activo { get; set; } = true;

    public Rol? Rol { get; set; }
    public Sucursal? Sucursal { get; set; }
}
