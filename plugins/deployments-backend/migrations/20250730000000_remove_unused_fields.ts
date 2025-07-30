import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('deployment_environments', table => {
    // Drop job_name and github_environment columns
    table.dropColumn('job_name');
    table.dropColumn('github_environment');
    
    // Make workflow_path nullable (optional)
    table.string('workflow_path_temp', 500).nullable();
  });

  // Copy data from workflow_path to workflow_path_temp
  await knex.raw(`
    UPDATE deployment_environments 
    SET workflow_path_temp = workflow_path
  `);

  await knex.schema.alterTable('deployment_environments', table => {
    // Drop old workflow_path column
    table.dropColumn('workflow_path');
  });

  // Rename workflow_path_temp to workflow_path
  await knex.schema.alterTable('deployment_environments', table => {
    table.renameColumn('workflow_path_temp', 'workflow_path');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('deployment_environments', table => {
    // Re-add job_name and github_environment columns
    table.string('job_name', 100).nullable();
    table.string('github_environment', 100).nullable();
    
    // Make workflow_path not nullable again
    table.string('workflow_path_temp', 500).notNullable().defaultTo('');
  });

  // Copy data from workflow_path to workflow_path_temp
  await knex.raw(`
    UPDATE deployment_environments 
    SET workflow_path_temp = COALESCE(workflow_path, '')
  `);

  await knex.schema.alterTable('deployment_environments', table => {
    // Drop old workflow_path column
    table.dropColumn('workflow_path');
  });

  // Rename workflow_path_temp to workflow_path
  await knex.schema.alterTable('deployment_environments', table => {
    table.renameColumn('workflow_path_temp', 'workflow_path');
  });
}