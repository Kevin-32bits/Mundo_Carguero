namespace Api_M_Carguero.Models.Dtos;

public class ProductoApiDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Proveedor { get; set; }
    public string? Telefono { get; set; }
    public int UnidadesPorCaja { get; set; }
    public decimal PrecioVentaCaja { get; set; }
    public decimal CostoCaja { get; set; }
    public decimal CostoUnitario { get; set; }
    public int StockCajas { get; set; }
    public DateTime FechaRegistro { get; set; }
}
