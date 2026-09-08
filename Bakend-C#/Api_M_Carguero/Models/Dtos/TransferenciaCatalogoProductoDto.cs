namespace Api_M_Carguero.Models.Dtos;

public class TransferenciaCatalogoProductoDto
{
    public int ProductoId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int UnidadesPorCaja { get; set; }
    public decimal PrecioVentaCaja { get; set; }
    public decimal PrecioCaja { get; set; }
}
