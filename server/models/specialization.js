'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Specialization extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Specialization.hasMany(models.DoctorProfile, {
        foreignKey: 'SpecializationId'
      })
      // define association here
    }
  }
  Specialization.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { is: /^[a-z0-9-]+$/ }
    }
  }, {
    sequelize,
    modelName: 'Specialization',
  });
  return Specialization;
};