using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GitClaw.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddApiKeyLookupHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Agents_ApiKeyHash",
                table: "Agents");

            // Add column as nullable first
            migrationBuilder.AddColumn<string>(
                name: "ApiKeyLookupHash",
                table: "Agents",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            // For existing agents, set a temporary placeholder value (they'll need to re-authenticate)
            // We can't generate the real lookup hash because we don't have the plaintext API keys
            migrationBuilder.Sql(@"
                UPDATE ""Agents""
                SET ""ApiKeyLookupHash"" = MD5(""Id""::text || '-migration-' || NOW()::text)
                WHERE ""ApiKeyLookupHash"" IS NULL
            ");

            // Now make it NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "ApiKeyLookupHash",
                table: "Agents",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldNullable: true);

            // Create unique index
            migrationBuilder.CreateIndex(
                name: "IX_Agents_ApiKeyLookupHash",
                table: "Agents",
                column: "ApiKeyLookupHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Agents_ApiKeyLookupHash",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "ApiKeyLookupHash",
                table: "Agents");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_ApiKeyHash",
                table: "Agents",
                column: "ApiKeyHash");
        }
    }
}
