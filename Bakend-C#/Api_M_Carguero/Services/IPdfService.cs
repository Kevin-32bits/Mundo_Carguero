using Api_M_Carguero.Models;

namespace Api_M_Carguero.Services;

public interface IPdfService
{
    byte[] GenerarFacturaPdf(Factura factura);
}
