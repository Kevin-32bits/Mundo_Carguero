using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class CrearCotizacionDto
{
    public int? ClienteId { get; set; }

    [Required]
    [StringLength(150)]
    public string ClienteNombre { get; set; } = string.Empty;

    [Required]
    [StringLength(10)]
    public string TipoDocumento { get; set; } = "DNI";

    [Required]
    [StringLength(20)]
    public string NumeroDocumento { get; set; } = string.Empty;

    [StringLength(30)]
    public string? Telefono { get; set; }

    [StringLength(120)]
    public string? Correo { get; set; }

    [StringLength(200)]
    public string? Direccion { get; set; }

    [Required]
    [MinLength(1)]
    public List<CrearCotizacionItemDto> Items { get; set; } = new();
}
