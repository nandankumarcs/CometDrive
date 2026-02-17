import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (!table.folder_id) {
      await queryInterface.addColumn('share', 'folder_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'folder', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    if (table.file_id?.allowNull === false) {
      await queryInterface.changeColumn('share', 'file_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'file', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    try {
      await queryInterface.addIndex('share', ['folder_id'], {
        name: 'idx_share_folder_id',
      });
    } catch (error: any) {
      if (error?.original?.code !== '42P07') {
        throw error;
      }
    }

    await queryInterface.sequelize
      .query(
        `
      ALTER TABLE "share"
      ADD CONSTRAINT "share_exactly_one_resource"
      CHECK (
        (file_id IS NOT NULL AND folder_id IS NULL)
        OR
        (file_id IS NULL AND folder_id IS NOT NULL)
      );
      `,
      )
      .catch((error: any) => {
        if (error?.original?.code !== '42710') {
          throw error;
        }
      });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "share" DROP CONSTRAINT IF EXISTS "share_exactly_one_resource";',
    );

    const table = await queryInterface.describeTable('share');

    if (table.folder_id) {
      await queryInterface.removeIndex('share', 'idx_share_folder_id').catch(() => undefined);
      await queryInterface.removeColumn('share', 'folder_id');
    }

    await queryInterface.changeColumn('share', 'file_id', {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'file', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
