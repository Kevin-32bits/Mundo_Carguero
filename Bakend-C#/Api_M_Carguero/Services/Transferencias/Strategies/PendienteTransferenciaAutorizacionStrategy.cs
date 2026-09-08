using Api_M_Carguero.Models;

namespace Api_M_Carguero.Services.Transferencias.Strategies;

public sealed class PendienteTransferenciaAutorizacionStrategy : ITransferenciaAutorizacionStrategy
{
    public bool CanHandle(TransferenciaInventario transferencia)
    {
        return string.Equals(
            transferencia.Estado,
            "Pendiente",
            StringComparison.OrdinalIgnoreCase);
    }

    public string Resolve(TransferenciaInventario transferencia)
    {
        return "Pendiente de autorizacion";
    }
}
