namespace Api_M_Carguero.Models.Dtos;

public class TransferenciaDetalleItemDto
{
    public int TransferenciaDetalleId { get; set; }
    public int ProductoId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public int Cajas { get; set; }
    public decimal CostoCaja { get; set; }
}
