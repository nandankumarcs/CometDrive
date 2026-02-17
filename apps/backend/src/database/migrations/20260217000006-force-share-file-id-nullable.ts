import { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "share" ALTER COLUMN "file_id" DROP NOT NULL;',
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE "share" ALTER COLUMN "file_id" SET NOT NULL;',
    );
  },
};
