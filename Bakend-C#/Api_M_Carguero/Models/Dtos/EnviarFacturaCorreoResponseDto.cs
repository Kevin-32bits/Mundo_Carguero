namespace Api_M_Carguero.Models.Dtos;

public class EnviarFacturaCorreoResponseDto
{
    public bool Exito { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public string Comprobante { get; set; } = string.Empty;
    public string Destinatario { get; set; } = string.Empty;

}
