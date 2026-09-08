using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class AprobarTransferenciaDto
{
    [Required]
    public int EmpleadoApruebaId { get; set; }
}
