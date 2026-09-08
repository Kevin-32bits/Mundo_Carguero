using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class CrearTransferenciaDto
{
    [Required]
    public int SucursalDestinoId { get; set; }

    [StringLength(200)]
    public string? Observacion { get; set; }

    [Required]
    [MinLength(1)]
    public List<CrearTransferenciaDetalleDto> Detalles { get; set; } = new();
}

