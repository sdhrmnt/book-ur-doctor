'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DoctorSchedule extends Model {
        static associate(models) {
            DoctorSchedule.belongsTo(models.DoctorProfile, { foreignKey: 'DoctorProfileId' });
            DoctorSchedule.belongsTo(models.Clinic, { foreignKey: 'ClinicId' });
        }
    }

    DoctorSchedule.init({
        DoctorProfileId: { type: DataTypes.INTEGER, allowNull: false },
        ClinicId: { type: DataTypes.INTEGER, allowNull: false },
        dayOfWeek: { type: DataTypes.INTEGER, allowNull: false },
        startTime: { type: DataTypes.TIME, allowNull: false },
        endTime: { type: DataTypes.TIME, allowNull: false },
        slotDurationMinutes: { type: DataTypes.INTEGER, allowNull: false },
        effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
        effectiveUntil: DataTypes.DATEONLY,
    }, {
        sequelize,
        modelName: 'DoctorSchedule',
    });

    return DoctorSchedule;
};
