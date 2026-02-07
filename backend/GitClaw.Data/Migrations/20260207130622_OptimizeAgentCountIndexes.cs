using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GitClaw.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeAgentCountIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add indexes on agent count columns for efficient sorting
            migrationBuilder.CreateIndex(
                name: "IX_Agents_RepositoryCount",
                table: "Agents",
                column: "RepositoryCount");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_ContributionCount",
                table: "Agents",
                column: "ContributionCount");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_FollowerCount",
                table: "Agents",
                column: "FollowerCount");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove indexes on rollback
            migrationBuilder.DropIndex(
                name: "IX_Agents_RepositoryCount",
                table: "Agents");

            migrationBuilder.DropIndex(
                name: "IX_Agents_ContributionCount",
                table: "Agents");

            migrationBuilder.DropIndex(
                name: "IX_Agents_FollowerCount",
                table: "Agents");
        }
    }
}
