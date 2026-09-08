using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_M_Carguero.Models;

[Table("Categorias")]
public class Categoria
{
    [Key]
    [Column("Id")]
    public int CategoriaId { get; set; }

    [Required]
    [StringLength(50)]
    public string Nombre { get; set; } = string.Empty;

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
