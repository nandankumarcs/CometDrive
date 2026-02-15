import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.removeColumn('file', 'storage_key');
};

export const down = async (queryInterface: QueryInterface, DataTypes: any): Promise<void> => {
  await queryInterface.addColumn('file', 'storage_key', {
    type: DataTypes.STRING(500),
    allowNull: true, // Make it nullable on rollback to avoid issues
  });
};
