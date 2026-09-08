namespace Api_M_Carguero.Models.Dtos;

public class CotizacionItemDto
{
    public int CotizacionDetalleId { get; set; }
    public int ProductoId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int CantidadCajas { get; set; }
    public decimal PrecioCaja { get; set; }
    public decimal SubTotal { get; set; }
}
