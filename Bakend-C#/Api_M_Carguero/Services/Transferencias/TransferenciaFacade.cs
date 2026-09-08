using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;
using Api_M_Carguero.Services.Transferencias.Strategies;

namespace Api_M_Carguero.Services.Transferencias;

public sealed class TransferenciaFacade : ITransferenciaFacade
{
    private readonly IReadOnlyList<ITransferenciaAutorizacionStrategy> _autorizacionStrategies;

    public TransferenciaFacade(IEnumerable<ITransferenciaAutorizacionStrategy> autorizacionStrategies)
    {
        _autorizacionStrategies = autorizacionStrategies.ToList();
    }

    public TransferenciaListadoDto BuildListado(TransferenciaInventario transferencia)
    {
        var estrategia = _autorizacionStrategies.FirstOrDefault(s => s.CanHandle(transferencia));
        var autorizadoPor = estrategia?.Resolve(transferencia) ?? "No registrado";
        var solicitadoPor = ResolveSolicitadoPor(transferencia);

        return new TransferenciaListadoDtoBuilder()
            .WithTransferenciaId(transferencia.TransferenciaId)
            .WithFecha(transferencia.FechaSolicitud)
            .WithOrigen(transferencia.SucursalOrigen?.Nombre ?? "Almacen")
            .WithDestino(transferencia.SucursalDestino?.Nombre ?? "Sucursal")
            .WithItems(transferencia.Detalles?.Count ?? 0)
            .WithResponsable(transferencia.EmpleadoSolicitante?.Nombre ?? string.Empty)
            .WithSolicitadoPor(solicitadoPor)
            .WithAutorizadoPor(autorizadoPor)
            .WithEstado(transferencia.Estado)
            .Build();
    }

    public IReadOnlyList<TransferenciaListadoDto> BuildListado(IEnumerable<TransferenciaInventario> transferencias)
    {
        return transferencias.Select(BuildListado).ToList();
    }

    private static string ResolveSolicitadoPor(TransferenciaInventario transferencia)
    {
        var nombre = transferencia.EmpleadoSolicitante?.Nombre;
        return string.IsNullOrWhiteSpace(nombre) ? "No registrado" : nombre;
    }
}
