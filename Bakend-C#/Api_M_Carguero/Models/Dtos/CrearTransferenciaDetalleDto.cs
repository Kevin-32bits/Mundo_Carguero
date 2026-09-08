using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class CrearTransferenciaDetalleDto
{
    [Required]
    public int ProductoId { get; set; }

    [Range(1, int.MaxValue)]
    public int Cajas { get; set; }
}

