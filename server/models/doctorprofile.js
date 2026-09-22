'use strict';
const {
  Model,
  ForeignKeyConstraintError
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DoctorProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      DoctorProfile.belongsTo(models.User, { foreignKey: 'UserId' });
      DoctorProfile.belongsTo(models.Specialization, { foreignKey: 'SpecializationId' });
    }
  }
  DoctorProfile.init({
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    SpecializationId: { type: DataTypes.INTEGER, allowNull: false },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: true }
    },
    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 0 }
    },
    consultationFee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 0 }
    },
    languages: DataTypes.ARRAY(DataTypes.STRING),
    bio: DataTypes.TEXT,
    verifiedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'DoctorProfile',
  });
  return DoctorProfile;
};