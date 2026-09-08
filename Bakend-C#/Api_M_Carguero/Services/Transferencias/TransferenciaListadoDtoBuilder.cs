using Api_M_Carguero.Models.Dtos;

namespace Api_M_Carguero.Services.Transferencias;

public sealed class TransferenciaListadoDtoBuilder
{
    private readonly TransferenciaListadoDto _dto = new();

    public TransferenciaListadoDtoBuilder WithTransferenciaId(int transferenciaId)
    {
        _dto.TransferenciaId = transferenciaId;
        _dto.Id = $"TRF-{transferenciaId:000000}";
        return this;
    }

    public TransferenciaListadoDtoBuilder WithFecha(DateTime fechaTransferencia)
    {
        _dto.Fecha = fechaTransferencia.ToString("MM/dd/yyyy");
        return this;
    }

    public TransferenciaListadoDtoBuilder WithOrigen(string origen)
    {
        _dto.Origen = origen;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithDestino(string destino)
    {
        _dto.Destino = destino;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithItems(int items)
    {
        _dto.Items = items;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithResponsable(string responsable)
    {
        _dto.Responsable = responsable;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithSolicitadoPor(string solicitadoPor)
    {
        _dto.SolicitadoPor = solicitadoPor;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithAutorizadoPor(string autorizadoPor)
    {
        _dto.AutorizadoPor = autorizadoPor;
        return this;
    }

    public TransferenciaListadoDtoBuilder WithEstado(string estado)
    {
        _dto.Estado = estado;
        return this;
    }

    public TransferenciaListadoDto Build()
    {
        return _dto;
    }
}
