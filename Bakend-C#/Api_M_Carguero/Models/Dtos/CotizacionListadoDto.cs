namespace Api_M_Carguero.Models.Dtos;

public class CotizacionListadoDto
{
    public int CotizacionId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public decimal Total { get; set; }
}
