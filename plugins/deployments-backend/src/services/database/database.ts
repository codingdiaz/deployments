import { DatabaseService } from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import { applyDatabaseMigrations } from './migrations';

export const initializeDatabase = async (
  database: DatabaseService,
): Promise<Knex> => {
  const client = await database.getClient();

  if (!database.migrations?.skip) {
    await applyDatabaseMigrations(client);
  }

  return client;
};
