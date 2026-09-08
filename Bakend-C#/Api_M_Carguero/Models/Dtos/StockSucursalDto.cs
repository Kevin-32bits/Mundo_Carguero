namespace Api_M_Carguero.Models.Dtos;

public class StockSucursalDto
{
    public int ProductoId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public int UnidadesPorCaja { get; set; }
    public decimal PrecioCaja { get; set; }
    public int StockCajas { get; set; }
}
