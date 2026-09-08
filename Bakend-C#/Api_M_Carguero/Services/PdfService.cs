using Api_M_Carguero.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Api_M_Carguero.Services;

public class PdfService : IPdfService
{
    private const decimal IgvRate = 0.18m;
    private const decimal IgvMultiplier = 1 + IgvRate;
    private const string ColorRojo = "#A60000";
    private const string ColorNegro = "#111111";
    private const string ColorGris = "#E6E6E6";
    private const string TextMuted = "#555555";

    private readonly IWebHostEnvironment _environment;

    public PdfService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public byte[] GenerarFacturaPdf(Factura factura)
    {
        var detalle = factura.Detalles
            .OrderBy(d => d.FacturaDetalleId)
            .ToList();

        var totalDetalle = Math.Round(detalle.Sum(x => x.SubTotal), 2);
        var total = factura.Total > 0 ? factura.Total : totalDetalle;
        var subtotal = factura.Subtotal > 0 ? factura.Subtotal : Math.Round(total / IgvMultiplier, 2);
        var igv = factura.IGV > 0 ? factura.IGV : Math.Round(total - subtotal, 2);
        var esFactura = string.Equals(factura.TipoComprobante, "Factura", StringComparison.OrdinalIgnoreCase);
        var titulo = esFactura ? "FACTURA ELECTRÓNICA" : "BOLETA ELECTRÓNICA";
        var documentoCliente = esFactura ? "RUC" : "DNI";
        var numeroComprobante = string.IsNullOrWhiteSpace(factura.NumeroComprobante)
            ? $"VTA-{factura.FacturaId:000000}"
            : factura.NumeroComprobante;
        var responsable = string.IsNullOrWhiteSpace(factura.Empleado?.Nombre)
            ? "Responsable no especificado"
            : factura.Empleado.Nombre;

        var logoBytes = LeerAsset("assets", "logo.png") ?? LeerAsset("assets", "img", "Logo_Empresa.png");
        var firmaBytes = LeerAsset("assets", "img", "Firma.png");

        using var stream = new MemoryStream();

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontColor(ColorNegro));

                page.Content().Column(column =>
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().PaddingLeft(30).PaddingTop(20).Row(brand =>
                        {
                            brand.ConstantItem(120).Element(c => DibujarLogo(c, logoBytes));
                            brand.RelativeItem().PaddingTop(10).Column(text =>
                            {
                                text.Item().Text("EL MUNDO DEL\nCARGUERO").Bold().FontSize(16).LineHeight(1.1f);
                                text.Item().PaddingTop(4).Text("RUC: 20123456789").FontSize(10).FontColor(TextMuted);
                            });
                        });

                        row.ConstantItem(220).Background(ColorRojo).PaddingLeft(10).PaddingRight(13).PaddingTop(15).PaddingBottom(15).Column(header =>
                        {
                            header.Item().AlignCenter().Text(titulo).Bold().FontSize(15).FontColor(Colors.White);
                            header.Item().PaddingTop(4).AlignCenter().Text("Teléfono: +51 987 654 321").FontSize(8).FontColor(Colors.White);
                            header.Item().PaddingTop(2).AlignCenter().Text("Web: www.elmundodelcarguero.com").FontSize(8).FontColor(Colors.White);
                            header.Item().PaddingTop(2).AlignCenter().Text("Dirección: Trujillo, Perú").FontSize(8).FontColor(Colors.White);
                        });
                    });

                    column.Item().PaddingTop(20).Height(4).Background(ColorRojo);

                    column.Item().PaddingLeft(30).PaddingRight(30).PaddingTop(20).PaddingBottom(20).Row(row =>
                    {
                        row.RelativeItem(6).Column(cliente =>
                        {
                            cliente.Item().Text("FACTURAR A:").Bold().FontSize(10).FontColor(ColorRojo);
                            cliente.Item().PaddingTop(5).Text((factura.Cliente?.Nombre ?? "CLIENTE NO ESPECIFICADO").ToUpperInvariant())
                                .Bold().FontSize(12);
                            cliente.Item().PaddingTop(2).Text($"{documentoCliente}: {factura.Cliente?.NumeroDocumento ?? "-"}")
                                .FontSize(10).FontColor(TextMuted);
                            cliente.Item().Text(factura.Cliente?.Direccion ?? "Dirección no especificada")
                                .FontSize(10).FontColor(TextMuted);
                        });

                        row.RelativeItem(4).AlignRight().Column(comprobante =>
                        {
                            comprobante.Item().Text(text =>
                            {
                                text.Span("COMPROBANTE # ").Bold().FontColor(ColorRojo);
                                text.Span(numeroComprobante).Bold().FontColor(ColorNegro);
                            });
                            comprobante.Item().PaddingTop(5).Text(text =>
                            {
                                text.Span("Fecha de Emisión: ").Bold().FontColor(ColorRojo);
                                text.Span(factura.FechaEmision.ToString("dd/MM/yyyy")).FontColor(ColorNegro);
                            });
                            comprobante.Item().PaddingTop(4).Text(text =>
                            {
                                text.Span("Hora de Emisión: ").Bold().FontColor(ColorRojo);
                                text.Span(factura.FechaEmision.ToString("hh:mm tt")).FontColor(ColorNegro);
                            });
                            comprobante.Item().PaddingTop(4).Text(text =>
                            {
                                text.Span("Responsable: ").Bold().FontColor(ColorRojo);
                                text.Span(responsable).FontColor(ColorNegro);
                            });
                        });
                    });

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(70);
                            columns.RelativeColumn();
                            columns.ConstantColumn(95);
                            columns.ConstantColumn(75);
                            columns.ConstantColumn(110);
                        });

                        table.Header(header =>
                        {
                            // He agregado .FontSize(12) en cada línea. Puedes cambiar el 12 por el tamaño que prefieras.
                            header.Cell().Element(TableHeaderCell).AlignCenter().Text("N.").Bold().FontSize(10).FontColor(Colors.White);
                            header.Cell().Element(TableHeaderCell).Text("PRODUCTO").Bold().FontSize(10).FontColor(Colors.White);
                            header.Cell().Element(TableHeaderCell).AlignCenter().Text("PRECIO").Bold().FontSize(10).FontColor(Colors.White);
                            header.Cell().Element(TableHeaderCell).AlignCenter().Text("CANT.").Bold().FontSize(10).FontColor(Colors.White);
                            header.Cell().Element(TableHeaderCell).AlignRight().Text("TOTAL").Bold().FontSize(10).FontColor(Colors.White);
                        });

                        for (var index = 0; index < detalle.Count; index++)
                        {
                            var item = detalle[index];
                            var rowIndex = index + 1;
                            table.Cell().Element(c => TableBodyCell(c, rowIndex)).AlignCenter().Text(rowIndex.ToString("00"));
                            table.Cell().Element(c => TableBodyCell(c, rowIndex)).Text(item.Producto?.Nombre ?? "Producto").Bold();
                            table.Cell().Element(c => TableBodyCell(c, rowIndex)).AlignCenter().Text(FormatoSoles(item.PrecioUnitarioVenta));
                            table.Cell().Element(c => TableBodyCell(c, rowIndex)).AlignCenter().Text(ObtenerCantidadMostrada(item));
                            table.Cell().Element(c => TableBodyCell(c, rowIndex)).AlignRight().Text(FormatoSoles(item.SubTotal));
                        }
                    });

                    column.Item().PaddingTop(0).Background(ColorRojo).PaddingLeft(30).PaddingVertical(4)
                        .Text("MÉTODO DE PAGO").Bold().FontSize(9).FontColor(Colors.White);

                    column.Item().PaddingLeft(30).PaddingRight(30).PaddingTop(15).Row(row =>
                    {
                        row.RelativeItem(54).Column(pago =>
                        {
                            pago.Item().Text("Transferencia Bancaria").Bold().FontSize(10).FontColor(ColorRojo);
                            pago.Item().PaddingTop(2).Text("Banco: BCP (Soles)").FontSize(9);
                            pago.Item().PaddingTop(2).Text("Cuenta: 193-12345678-0-99").FontSize(9);
                            pago.Item().PaddingTop(2).Text("Titular: EL MUNDO DEL CARGUERO S.A.C.").FontSize(9);
                            pago.Item().PaddingTop(25).Text("¡Gracias por su preferencia!").Bold().FontSize(11).FontColor(ColorRojo);
                        });

                        row.RelativeItem(46).Column(right =>
                        {
                            right.Item().Table(totales =>
                            {
                                totales.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn();
                                    columns.ConstantColumn(105);
                                });

                                TotalesRow(totales, "SUB TOTAL :", FormatoSoles(subtotal), ColorGris, ColorNegro, false);
                                TotalesRow(totales, $"I.G.V. ({IgvRate * 100:0}%) :", FormatoSoles(igv), ColorGris, ColorNegro, false);
                                TotalesRow(totales, "TOTAL A PAGAR :", FormatoSoles(total), ColorNegro, Colors.White, true);
                            });

                            right.Item().PaddingTop(20).AlignRight().Column(firma =>
                            {
                                firma.Item().AlignRight().Element(c => DibujarFirma(c, firmaBytes));
                                firma.Item().PaddingTop(2).Text("Esteilin Estil Lozano").FontSize(16).Italic().FontColor(ColorNegro);
                                firma.Item().Text("Gerente General").FontSize(10).FontColor(TextMuted);
                            });
                        });
                    });
                });

                page.Footer().Height(40).Background(ColorRojo).AlignCenter().AlignMiddle()
                    .Text("TÉRMINOS: Los productos cuentan con garantía de fábrica. No se aceptan devoluciones por daños causados por mal uso.")
                    .FontColor(Colors.White).FontSize(8);
            });
        }).GeneratePdf(stream);

        return stream.ToArray();
    }

    private byte[]? LeerAsset(params string[] segmentos)
    {
        var webRoot = _environment.WebRootPath;
        var candidates = new[]
        {
            !string.IsNullOrWhiteSpace(webRoot) ? Path.Combine(new[] { webRoot }.Concat(segmentos).ToArray()) : null,
            Path.Combine(new[] { _environment.ContentRootPath, "Assets" }.Concat(segmentos).ToArray()),
        };

        foreach (var path in candidates.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            if (File.Exists(path))
            {
                return File.ReadAllBytes(path);
            }
        }

        return null;
    }

    private static void DibujarLogo(IContainer container, byte[]? logoBytes)
    {
        if (logoBytes is { Length: > 0 })
        {
            container.Width(110).Image(logoBytes).FitWidth();
            return;
        }

        container.Text("EL MUNDO\nDEL CARGUERO").Bold().FontSize(12).FontColor(ColorRojo);
    }

    private static void DibujarFirma(IContainer container, byte[]? firmaBytes)
    {
        if (firmaBytes is { Length: > 0 })
        {
            container.Width(100).Image(firmaBytes).FitWidth();
            return;
        }

        container.Height(40);
    }

    private static IContainer TableHeaderCell(IContainer container)
    {
        return container.Background(ColorRojo).PaddingVertical(5).PaddingHorizontal(5);
    }

    private static IContainer TableBodyCell(IContainer container, int rowIndex)
    {
        var background = rowIndex % 2 == 0 ? "#F5F5F5" : "#FFFFFF";
        return container.Background(background).PaddingVertical(6).PaddingHorizontal(5);
    }

    private static void TotalesRow(TableDescriptor table, string label, string value, string background, string color, bool bold)
    {
        var labelText = table.Cell().Element(c => TotalCell(c, background)).AlignRight().Text(label).FontColor(color);
        var valueText = table.Cell().Element(c => TotalCell(c, background)).AlignRight().Text(value).FontColor(color);

        if (bold)
        {
            labelText.Bold();
            valueText.Bold();
        }
    }

    private static IContainer TotalCell(IContainer container, string background)
    {
        return container.Background(background).PaddingVertical(6).PaddingHorizontal(10);
    }

    private static string FormatoSoles(decimal value)
    {
        return $"S/ {value:N2}";
    }

    private static string ObtenerCantidadMostrada(FacturaDetalle item)
    {
        if (string.Equals(item.TipoUnidadVenta, "Caja", StringComparison.OrdinalIgnoreCase)
            && item.Producto?.UnidadesPorCaja > 0)
        {
            var cajas = (decimal)item.Cantidad / item.Producto.UnidadesPorCaja;
            return cajas % 1 == 0 ? ((int)cajas).ToString("00") : cajas.ToString("0.##");
        }

        return item.Cantidad.ToString("00");
    }
}
