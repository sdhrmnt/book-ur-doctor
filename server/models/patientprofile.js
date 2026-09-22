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
      // define association here
    }
  }
  PatientProfile.init({
    UserId: DataTypes.INTEGER,
    dateOfBirth: DataTypes.DATE,
    gender: DataTypes.STRING,
    bloodType: DataTypes.STRING,
    allergies: DataTypes.TEXT,
    emergencyContact: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'PatientProfile',
  });
  return PatientProfile;
};