namespace Api_M_Carguero.Models.Dtos;

public class FacturaListadoDto
{
    public int FacturaId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string TipoComprobante { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string MetodoPago { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Estado { get; set; } = string.Empty;
}
