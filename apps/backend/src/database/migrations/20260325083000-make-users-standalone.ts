import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.changeColumn('user', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.sequelize.query(`
    UPDATE "user"
    SET organization_id = NULL
  `);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.sequelize.query(`
    UPDATE "user" AS u
    SET organization_id = o.id
    FROM "organization" AS o
    WHERE u.organization_id IS NULL
      AND o.id = (
        SELECT id
        FROM "organization"
        ORDER BY id
        LIMIT 1
      )
  `);

  await queryInterface.changeColumn('user', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: false,
  });
};
