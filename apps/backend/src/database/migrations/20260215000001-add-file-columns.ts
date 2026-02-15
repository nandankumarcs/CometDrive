import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.addColumn('file', 'original_name', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unknown',
  });
  await queryInterface.addColumn('file', 'storage_path', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unknown',
  });
  await queryInterface.addColumn('file', 'storage_bucket', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn('file', 'storage_provider', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'local',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.removeColumn('file', 'original_name');
  await queryInterface.removeColumn('file', 'storage_path');
  await queryInterface.removeColumn('file', 'storage_bucket');
  await queryInterface.removeColumn('file', 'storage_provider');
};
