'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Clinic extends Model {
        static associate(models) {
            Clinic.hasMany(models.Appointment, { foreignKey: 'ClinicId' });
        }
    }

    Clinic.init({
        name: { type: DataTypes.STRING, allowNull: false },
        address: { type: DataTypes.STRING, allowNull: false },
        city: { type: DataTypes.STRING, allowNull: false },
        timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Asia/Jakarta' },
    }, {
        sequelize,
        modelName: 'Clinic',
    });

    return Clinic;
};