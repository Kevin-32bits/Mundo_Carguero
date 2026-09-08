namespace Api_M_Carguero.Models.Dtos;

public class FacturaDetalleDto
{
    public int FacturaId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string TipoComprobante { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    public int Numero { get; set; }
    public string Cliente { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string MetodoPago { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Vendedor { get; set; } = string.Empty;
    public List<FacturaDetalleItemDto> Items { get; set; } = new();
}
