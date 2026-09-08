using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class CrearCotizacionItemDto
{
    [Required]
    public int ProductoId { get; set; }

    [Range(1, int.MaxValue)]
    public int CantidadCajas { get; set; }

    [Range(0, 999999999)]
    public decimal PrecioCaja { get; set; }
}
