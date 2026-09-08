using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class FacturarCotizacionDto
{
    [Required]
    [StringLength(10)]
    public string TipoComprobante { get; set; } = "BOLETA";

    [Required]
    [StringLength(20)]
    public string MetodoPago { get; set; } = "Efectivo";
}
