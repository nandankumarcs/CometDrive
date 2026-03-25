import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  const table = await queryInterface.describeTable('user');

  if (!table.max_storage) {
    await queryInterface.addColumn('user', 'max_storage', {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1073741824,
    });
  }

  if (!table.storage_used) {
    await queryInterface.addColumn('user', 'storage_used', {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    });
  }

  await queryInterface.sequelize.query(`
    UPDATE "user" AS u
    SET
      max_storage = COALESCE(o.max_storage, 1073741824),
      storage_used = COALESCE((
        SELECT SUM(f.size)::BIGINT
        FROM "file" AS f
        WHERE f.user_id = u.id
      ), 0)
    FROM "organization" AS o
    WHERE u.organization_id = o.id
  `);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  const table = await queryInterface.describeTable('user');

  if (table.storage_used) {
    await queryInterface.removeColumn('user', 'storage_used');
  }

  if (table.max_storage) {
    await queryInterface.removeColumn('user', 'max_storage');
  }
};
