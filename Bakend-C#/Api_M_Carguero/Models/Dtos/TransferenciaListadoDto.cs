namespace Api_M_Carguero.Models.Dtos;

public class TransferenciaListadoDto
{
    public int TransferenciaId { get; set; }
    public string Id { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string Origen { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public int Items { get; set; }
    public string Responsable { get; set; } = string.Empty;
    public string SolicitadoPor { get; set; } = string.Empty;
    public string AutorizadoPor { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
}
