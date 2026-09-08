using Api_M_Carguero.Configurations;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Api_M_Carguero.Services;

public class EmailService : IEmailService
{
    private readonly SmtpSettings _smtpSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> smtpOptions, ILogger<EmailService> logger)
    {
        _smtpSettings = smtpOptions.Value;
        _logger = logger;
    }

    public async Task EnviarCorreoConAdjuntoAsync(
        string paraEmail,
        string paraNombre,
        string asunto,
        string htmlBody,
        byte[] attachmentContent,
        string attachmentFileName,
        string attachmentContentType,
        CancellationToken cancellationToken = default)
    {
        ValidarConfiguracion();

        var mensaje = new MimeMessage();
        mensaje.From.Add(new MailboxAddress(_smtpSettings.SenderName, _smtpSettings.SenderEmail));
        mensaje.To.Add(new MailboxAddress(paraNombre, paraEmail));
        mensaje.Subject = asunto;

        var builder = new BodyBuilder
        {
            HtmlBody = htmlBody
        };

        builder.Attachments.Add(attachmentFileName, attachmentContent, ContentType.Parse(attachmentContentType));
        mensaje.Body = builder.ToMessageBody();

        using var cliente = new SmtpClient();
        try
        {
            var secureSocket = _smtpSettings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
            await cliente.ConnectAsync(_smtpSettings.Host, _smtpSettings.Port, secureSocket, cancellationToken);
            await cliente.AuthenticateAsync(_smtpSettings.Username, _smtpSettings.AppPassword, cancellationToken);
            await cliente.SendAsync(mensaje, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enviando correo SMTP a {ParaEmail}", paraEmail);
            throw;
        }
        finally
        {
            if (cliente.IsConnected)
            {
                await cliente.DisconnectAsync(true, cancellationToken);
            }
        }
    }

    private void ValidarConfiguracion()
    {
        if (string.IsNullOrWhiteSpace(_smtpSettings.Host)
            || string.IsNullOrWhiteSpace(_smtpSettings.SenderEmail)
            || string.IsNullOrWhiteSpace(_smtpSettings.Username)
            || string.IsNullOrWhiteSpace(_smtpSettings.AppPassword))
        {
            throw new InvalidOperationException("La configuracion SMTP es incompleta. Revisa la seccion SmtpSettings.");
        }
    }
}
