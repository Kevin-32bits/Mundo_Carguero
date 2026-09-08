using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Roles")]
public class Rol
{
    [Key]
    [Column("Id")]
    public int RolId { get; set; }

    [Required]
    [StringLength(50)]
    public string NombreRol { get; set; } = string.Empty;
}
