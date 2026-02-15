import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('file', 'is_starred', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  });
  await queryInterface.addColumn('folder', 'is_starred', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('file', 'is_starred');
  await queryInterface.removeColumn('folder', 'is_starred');
}
