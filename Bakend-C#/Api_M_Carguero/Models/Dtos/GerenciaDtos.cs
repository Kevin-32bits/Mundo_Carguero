using System.ComponentModel.DataAnnotations;

namespace Api_M_Carguero.Models.Dtos;

public class LoginDto
{
    public string Usuario { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class DashboardGerenciaDto
{
    public DashboardKpisDto Kpis { get; set; } = new();
    public DashboardTendenciaDto Tendencia { get; set; } = new();
    public List<DashboardSerieItemDto> VentasSerieSemana { get; set; } = new();
    public List<DashboardSerieItemDto> VentasSerieMes { get; set; } = new();
    public List<DashboardTiendaDto> VentasPorTienda { get; set; } = new();
    public List<DashboardAlertaStockDto> AlertasStock { get; set; } = new();
}


public class DashboardKpisDto
{
    public decimal Ventas { get; set; }
    public int Alertas { get; set; }
    public int Clientes { get; set; }
}

public class DashboardTendenciaDto
{
    public decimal Ventas { get; set; }
    public decimal Clientes { get; set; }
}

public class DashboardSerieItemDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

public class DashboardTiendaDto
{
    public string Nombre { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public decimal Porcentaje { get; set; }
}

public class DashboardAlertaStockDto
{
    public string Producto { get; set; } = string.Empty;
    public int Stock { get; set; }
    public string Nivel { get; set; } = "bajo";
}

public class EmpleadoListadoGerenciaDto
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Dni { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public int UbicacionId { get; set; }
    public string Ubicacion { get; set; } = string.Empty;
    public bool EstadoLaboral { get; set; }
    public int? RolId { get; set; }
    public string? Rol { get; set; }
    public string? Usuario { get; set; }
}

public class CatalogoIdNombreDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
}

public class CrearEmpleadoGerenciaDto
{
    [Required]
    [StringLength(150)]
    public string NombreCompleto { get; set; } = string.Empty;

    [Required]
    [StringLength(15)]
    public string Dni { get; set; } = string.Empty;

    [StringLength(10)]
    public string? Telefono { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar un rol.")]
    public int RolId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar una ubicacion.")]
    public int UbicacionId { get; set; }

    public bool EstadoLaboral { get; set; } = true;

    [Required(ErrorMessage = "El nombre de usuario es obligatorio.")]
    [StringLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Debe confirmar la contraseña.")]
    public string ConfirmarPassword { get; set; } = string.Empty;
}

public class ActualizarEmpleadoDto
{
    [Required(ErrorMessage = "El nombre completo es obligatorio.")]
    [StringLength(150)]
    public string NombreCompleto { get; set; } = string.Empty;

    [Required(ErrorMessage = "El DNI es obligatorio.")]
    [StringLength(15)]
    public string Dni { get; set; } = string.Empty;

    [StringLength(10, ErrorMessage = "El teléfono no puede superar los 10 caracteres.")]
    public string? Telefono { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar un rol válido.")]
    public int RolId { get; set; }

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar una ubicación válida.")]
    public int UbicacionId { get; set; }

    [Required(ErrorMessage = "El nombre de usuario es obligatorio.")]
    [StringLength(50)]
    public string Usuario { get; set; } = string.Empty;

    // IMPORTANTE: La contraseña es opcional en la actualización.
    // En tu controlador, si este campo llega nulo o vacío, NO debes actualizar la clave en la base de datos.
    public string? Password { get; set; }
}

public class ActualizarEstadoEmpleadoGerenciaDto
{
    [Range(0, 1)]
    public int EstadoLaboral { get; set; } = 1;
}
