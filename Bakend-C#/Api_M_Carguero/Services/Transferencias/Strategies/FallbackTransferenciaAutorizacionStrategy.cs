using Api_M_Carguero.Models;

namespace Api_M_Carguero.Services.Transferencias.Strategies;

public sealed class FallbackTransferenciaAutorizacionStrategy : ITransferenciaAutorizacionStrategy
{
    public bool CanHandle(TransferenciaInventario transferencia)
    {
        return true;
    }

    public string Resolve(TransferenciaInventario transferencia)
    {
        return "No registrado";
    }
}
