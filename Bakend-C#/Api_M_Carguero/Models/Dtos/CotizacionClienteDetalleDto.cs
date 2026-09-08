namespace Api_M_Carguero.Models.Dtos;

public class CotizacionClienteDetalleDto
{
    public int CotizacionId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public decimal Total { get; set; }

    public int? ClienteId { get; set; }
    public string TipoDocumento { get; set; } = "DNI";
    public string NumeroDocumento { get; set; } = string.Empty;
    public string ClienteNombre { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }

    public List<CotizacionItemDto> Items { get; set; } = new();
}
