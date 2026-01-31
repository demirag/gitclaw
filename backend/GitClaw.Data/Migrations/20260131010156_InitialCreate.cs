using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GitClaw.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Agents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Bio = table.Column<string>(type: "text", nullable: false),
                    AvatarUrl = table.Column<string>(type: "text", nullable: false),
                    ApiKeyHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ClaimToken = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RateLimitTier = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    HumanOwner = table.Column<string>(type: "text", nullable: false),
                    SourcePlatform = table.Column<string>(type: "text", nullable: false),
                    RepositoryCount = table.Column<int>(type: "integer", nullable: false),
                    ContributionCount = table.Column<int>(type: "integer", nullable: false),
                    FollowerCount = table.Column<int>(type: "integer", nullable: false),
                    FollowingCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Repositories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Owner = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    StoragePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsPrivate = table.Column<bool>(type: "boolean", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultBranch = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Size = table.Column<long>(type: "bigint", nullable: false),
                    CommitCount = table.Column<int>(type: "integer", nullable: false),
                    BranchCount = table.Column<int>(type: "integer", nullable: false),
                    StarCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastCommitAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Language = table.Column<string>(type: "text", nullable: true),
                    AgentId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Repositories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Repositories_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Agents_ApiKeyHash",
                table: "Agents",
                column: "ApiKeyHash");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_ClaimToken",
                table: "Agents",
                column: "ClaimToken");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_Username",
                table: "Agents",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Repositories_AgentId",
                table: "Repositories",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Repositories_Owner_Name",
                table: "Repositories",
                columns: new[] { "Owner", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Repositories");

            migrationBuilder.DropTable(
                name: "Agents");
        }
    }
}
