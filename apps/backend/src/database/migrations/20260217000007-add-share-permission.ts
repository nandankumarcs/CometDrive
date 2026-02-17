import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (!table.permission) {
      await queryInterface.addColumn('share', 'permission', {
        type: DataTypes.ENUM('viewer', 'editor'),
        allowNull: false,
        defaultValue: 'viewer',
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (table.permission) {
      await queryInterface.removeColumn('share', 'permission');
    }

    await queryInterface.sequelize
      .query('DROP TYPE IF EXISTS "enum_share_permission";')
      .catch(() => undefined);
  },
};
