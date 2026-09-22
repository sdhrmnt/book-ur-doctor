'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DoctorProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DoctorProfile.init({
    UserId: DataTypes.INTEGER,
    licenseNumber: DataTypes.STRING,
    experienceYear: DataTypes.INTEGER,
    consultationFee: DataTypes.INTEGER,
    languages: DataTypes.STRING,
    bio: DataTypes.TEXT,
    verifiedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'DoctorProfile',
  });
  return DoctorProfile;
};