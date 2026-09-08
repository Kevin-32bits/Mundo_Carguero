using Api_M_Carguero.Models;

namespace Api_M_Carguero.Services.Transferencias.Strategies;

public sealed class AprobadaTransferenciaAutorizacionStrategy : ITransferenciaAutorizacionStrategy
{
    public bool CanHandle(TransferenciaInventario transferencia)
    {
        return transferencia.EmpleadoApruebaId.HasValue || transferencia.EmpleadoAprueba is not null;
    }

    public string Resolve(TransferenciaInventario transferencia)
    {
        var nombre = transferencia.EmpleadoAprueba?.Nombre;
        return string.IsNullOrWhiteSpace(nombre) ? "No registrado" : nombre;
    }
}
