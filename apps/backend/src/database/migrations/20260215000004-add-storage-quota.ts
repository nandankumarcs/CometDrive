import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.addColumn('organization', 'max_storage', {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 1073741824, // 1GB
    });

    await queryInterface.addColumn('organization', 'storage_used', {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn('organization', 'max_storage');
    await queryInterface.removeColumn('organization', 'storage_used');
  },
};
