'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ScheduleException extends Model {
        static associate(models) {
            ScheduleException.belongsTo(models.DoctorProfile, { foreignKey: 'DoctorProfileId' });
            ScheduleException.belongsTo(models.Clinic, { foreignKey: 'ClinicId' });
        }
    }

    ScheduleException.init({
        DoctorProfileId: { type: DataTypes.INTEGER, allowNull: false },
        ClinicId: DataTypes.INTEGER,
        date: { type: DataTypes.DATEONLY, allowNull: false },
        type: {
            type: DataTypes.ENUM('off', 'extra'),
            allowNull: false,
        },
        startTime: DataTypes.TIME,
        endTime: DataTypes.TIME,
        reason: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'ScheduleException',
    });

    return ScheduleException;
};
