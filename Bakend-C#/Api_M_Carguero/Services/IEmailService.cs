namespace Api_M_Carguero.Services;

public interface IEmailService
{
    Task EnviarCorreoConAdjuntoAsync(
        string paraEmail,
        string paraNombre,
        string asunto,
        string htmlBody,
        byte[] attachmentContent,
        string attachmentFileName,
        string attachmentContentType,
        CancellationToken cancellationToken = default);
}
