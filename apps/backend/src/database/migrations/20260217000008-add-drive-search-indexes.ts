import { QueryInterface } from 'sequelize';

const FILE_NAME_TSV_INDEX = 'IDX_FILE_NAME_TSV_GIN';
const FOLDER_NAME_TSV_INDEX = 'IDX_FOLDER_NAME_TSV_GIN';
const FILE_NAME_TRGM_INDEX = 'IDX_FILE_NAME_TRGM_GIN';
const FOLDER_NAME_TRGM_INDEX = 'IDX_FOLDER_NAME_TRGM_GIN';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS "${FILE_NAME_TSV_INDEX}"
    ON "file"
    USING GIN (to_tsvector('simple', coalesce(name, '')));
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS "${FOLDER_NAME_TSV_INDEX}"
    ON "folder"
    USING GIN (to_tsvector('simple', coalesce(name, '')));
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS "${FILE_NAME_TRGM_INDEX}"
    ON "file"
    USING GIN (lower(name) gin_trgm_ops);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS "${FOLDER_NAME_TRGM_INDEX}"
    ON "folder"
    USING GIN (lower(name) gin_trgm_ops);
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${FILE_NAME_TRGM_INDEX}";`);
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${FOLDER_NAME_TRGM_INDEX}";`);
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${FILE_NAME_TSV_INDEX}";`);
  await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "${FOLDER_NAME_TSV_INDEX}";`);
}
