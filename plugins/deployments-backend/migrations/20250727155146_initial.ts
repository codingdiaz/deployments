import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('deployment_environments', table => {
    table.uuid('id').primary().notNullable();
    table.string('component_name', 100).notNullable();
    table.string('environment_name', 50).notNullable();
    table.string('github_repo', 200).notNullable();
    table.string('workflow_path', 500).notNullable();
    table.string('job_name', 100).notNullable();
    table.string('github_environment', 100).nullable();
    table.timestamps(true, true); // created_at, updated_at with timezone

    // Ensure unique environment names per component
    table.unique(['component_name', 'environment_name']);
    
    // Indexes for common queries
    table.index(['component_name']);
    table.index(['github_repo']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('deployment_environments');
}

