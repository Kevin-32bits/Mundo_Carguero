using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class ClienteListadoDto
{
    public int ClienteId { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
}
