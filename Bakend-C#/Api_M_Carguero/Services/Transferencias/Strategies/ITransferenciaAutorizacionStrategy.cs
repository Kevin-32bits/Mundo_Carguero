using Api_M_Carguero.Models;

namespace Api_M_Carguero.Services.Transferencias.Strategies;

public interface ITransferenciaAutorizacionStrategy
{
    bool CanHandle(TransferenciaInventario transferencia);
    string Resolve(TransferenciaInventario transferencia);
}
