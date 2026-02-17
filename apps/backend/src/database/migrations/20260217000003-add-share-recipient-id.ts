import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (!table.recipient_id) {
      await queryInterface.addColumn('share', 'recipient_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    try {
      await queryInterface.addIndex('share', ['recipient_id'], {
        name: 'idx_share_recipient_id',
      });
    } catch (error: any) {
      if (error?.original?.code !== '42P07') {
        throw error;
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('share');

    if (table.recipient_id) {
      await queryInterface.removeIndex('share', 'idx_share_recipient_id').catch(() => undefined);
      await queryInterface.removeColumn('share', 'recipient_id');
    }
  },
};
