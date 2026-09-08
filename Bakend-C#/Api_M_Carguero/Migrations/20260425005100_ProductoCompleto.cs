using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api_M_Carguero.Migrations
{
    /// <inheritdoc />
    public partial class ProductoCompleto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Stock",
                table: "Productos",
                newName: "UnidadesPorCaja");

            migrationBuilder.RenameColumn(
                name: "Precio",
                table: "Productos",
                newName: "PrecioVentaCaja");

            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "Productos",
                type: "nvarchar(70)",
                maxLength: 70,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "CostoCaja",
                table: "Productos",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CostoUnitario",
                table: "Productos",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Proveedor",
                table: "Productos",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sku",
                table: "Productos",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "StockCajas",
                table: "Productos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Telefono",
                table: "Productos",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Productos_Sku",
                table: "Productos",
                column: "Sku",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Productos_Sku",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "CostoCaja",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "CostoUnitario",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "Proveedor",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "Sku",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "StockCajas",
                table: "Productos");

            migrationBuilder.DropColumn(
                name: "Telefono",
                table: "Productos");

            migrationBuilder.RenameColumn(
                name: "UnidadesPorCaja",
                table: "Productos",
                newName: "Stock");

            migrationBuilder.RenameColumn(
                name: "PrecioVentaCaja",
                table: "Productos",
                newName: "Precio");
        }
    }
}
