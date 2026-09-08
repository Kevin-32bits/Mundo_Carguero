using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Clientes")]
public class Cliente
{
    [Key]
    [Column("Id")]
    public int ClienteId { get; set; }

    [Required]
    [StringLength(10)]
    public string TipoDocumento { get; set; } = "DNI";

    [Required]
    [StringLength(20)]
    public string NumeroDocumento { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("NombreRazonSocial")]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(10)]
    public string? Telefono { get; set; }

    [StringLength(50)]
    public string? Correo { get; set; }

    [StringLength(100)]
    public string? Direccion { get; set; }

    public ICollection<Cotizacion> Cotizaciones { get; set; } = new List<Cotizacion>();
}
