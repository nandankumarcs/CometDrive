import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (!table.password_hash) {
      await queryInterface.addColumn('share', 'password_hash', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!table.download_enabled) {
      await queryInterface.addColumn('share', 'download_enabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (table.download_enabled) {
      await queryInterface.removeColumn('share', 'download_enabled');
    }

    if (table.password_hash) {
      await queryInterface.removeColumn('share', 'password_hash');
    }
  },
};
