using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GitClaw.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ForkCount",
                table: "Repositories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "WatcherCount",
                table: "Repositories",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "RepositoryPins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepositoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    PinnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepositoryPins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepositoryPins_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepositoryPins_Repositories_RepositoryId",
                        column: x => x.RepositoryId,
                        principalTable: "Repositories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RepositoryStars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepositoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentId = table.Column<Guid>(type: "uuid", nullable: false),
                    StarredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepositoryStars", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepositoryStars_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepositoryStars_Repositories_RepositoryId",
                        column: x => x.RepositoryId,
                        principalTable: "Repositories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RepositoryWatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepositoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentId = table.Column<Guid>(type: "uuid", nullable: false),
                    WatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepositoryWatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RepositoryWatches_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepositoryWatches_Repositories_RepositoryId",
                        column: x => x.RepositoryId,
                        principalTable: "Repositories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryPins_AgentId_Order",
                table: "RepositoryPins",
                columns: new[] { "AgentId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryPins_AgentId_RepositoryId",
                table: "RepositoryPins",
                columns: new[] { "AgentId", "RepositoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryPins_RepositoryId",
                table: "RepositoryPins",
                column: "RepositoryId");

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryStars_AgentId",
                table: "RepositoryStars",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryStars_RepositoryId_AgentId",
                table: "RepositoryStars",
                columns: new[] { "RepositoryId", "AgentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryWatches_AgentId",
                table: "RepositoryWatches",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_RepositoryWatches_RepositoryId_AgentId",
                table: "RepositoryWatches",
                columns: new[] { "RepositoryId", "AgentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RepositoryPins");

            migrationBuilder.DropTable(
                name: "RepositoryStars");

            migrationBuilder.DropTable(
                name: "RepositoryWatches");

            migrationBuilder.DropColumn(
                name: "ForkCount",
                table: "Repositories");

            migrationBuilder.DropColumn(
                name: "WatcherCount",
                table: "Repositories");
        }
    }
}
