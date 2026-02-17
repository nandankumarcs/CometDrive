import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('file_video_comment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    file_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'file',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    content: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    timestamp_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

  await queryInterface.addIndex('file_video_comment', ['uuid'], {
    name: 'UQ_FILE_VIDEO_COMMENT_UUID',
    unique: true,
  });

  await queryInterface.addIndex('file_video_comment', ['file_id', 'created_at'], {
    name: 'IDX_FILE_VIDEO_COMMENT_FILE_CREATED_AT',
  });

  await queryInterface.addIndex('file_video_comment', ['file_id', 'timestamp_seconds'], {
    name: 'IDX_FILE_VIDEO_COMMENT_FILE_TIMESTAMP',
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('file_video_comment');
};
