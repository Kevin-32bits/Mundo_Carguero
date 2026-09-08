using Api_M_Carguero.Models;
using Api_M_Carguero.Models.Dtos;

namespace Api_M_Carguero.Services.Transferencias;

public interface ITransferenciaFacade
{
    TransferenciaListadoDto BuildListado(TransferenciaInventario transferencia);
    IReadOnlyList<TransferenciaListadoDto> BuildListado(IEnumerable<TransferenciaInventario> transferencias);
}
