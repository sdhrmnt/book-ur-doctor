'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PatientProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PatientProfile.belongsTo(models.User, { foreignKey: 'UserId' })
      // define association here
    }
  }
  PatientProfile.init({
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [['male', 'female', 'undisclosed']] }
    },
    bloodType: DataTypes.STRING,
    allergies: DataTypes.TEXT,
    emergencyContact: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'PatientProfile',
  });
  return PatientProfile;
};