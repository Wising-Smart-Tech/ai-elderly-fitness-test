// models/User.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        field: "password_hash",
      },
      role: {
        type: DataTypes.ENUM("admin", "elderly_user"),
        defaultValue: "elderly_user",
        allowNull: false,
      },
      gender: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
          isIn: [["male", "female"]],
        },
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      height: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      createdBy: {
        type: DataTypes.INTEGER,
        field: "created_by",
        references: {
          model: "users",
          key: "id",
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      lastLogin: {
        type: DataTypes.DATE,
        field: "last_login",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.passwordHash && !user.passwordHash.startsWith("$2")) {
            const bcrypt = require("bcrypt");
            user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (
            user.changed("passwordHash") &&
            user.passwordHash &&
            !user.passwordHash.startsWith("$2")
          ) {
            const bcrypt = require("bcrypt");
            user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
          }
        },
      },
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.User, {
      as: "creator",
      foreignKey: "createdBy",
    });
    User.hasMany(models.User, {
      as: "createdUsers",
      foreignKey: "createdBy",
    });
  };

  return User;
};
