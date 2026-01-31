using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GitClaw.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVerificationCodeAndClaimedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClaimedAt",
                table: "Agents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationCode",
                table: "Agents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClaimedAt",
                table: "Agents");

            migrationBuilder.DropColumn(
                name: "VerificationCode",
                table: "Agents");
        }
    }
}
