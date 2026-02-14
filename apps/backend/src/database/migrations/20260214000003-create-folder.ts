import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('folder', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'folder',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('folder', ['uuid'], {
    name: 'IDX_FOLDER_UUID',
    unique: true,
  });

  await queryInterface.addIndex('folder', ['user_id'], {
    name: 'IDX_FOLDER_USER_ID',
  });

  await queryInterface.addIndex('folder', ['parent_id'], {
    name: 'IDX_FOLDER_PARENT_ID',
  });

  await queryInterface.addIndex('folder', ['deleted_at'], {
    name: 'IDX_FOLDER_DELETED_AT',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('folder');
};
