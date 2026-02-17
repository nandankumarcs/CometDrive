import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('share', 'file_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'file', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('share', 'file_id', {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'file', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};
