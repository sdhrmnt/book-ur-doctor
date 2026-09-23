'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Appointment extends Model {
        static associate(models) {
            Appointment.belongsTo(models.User, { as: 'Patient', foreignKey: 'PatientId' });
            Appointment.belongsTo(models.DoctorProfile, { foreignKey: 'DoctorProfileId' });
            Appointment.belongsTo(models.Clinic, { foreignKey: 'ClinicId' });
            Appointment.belongsTo(models.User, { as: 'CancelledBy', foreignKey: 'cancelledBy' });
            Appointment.belongsTo(models.Appointment, { as: 'RescheduledFrom', foreignKey: 'rescheduledFromId' });
        }
    }

    Appointment.init({
        PatientId: { type: DataTypes.INTEGER, allowNull: false },
        DoctorProfileId: { type: DataTypes.INTEGER, allowNull: false },
        ClinicId: { type: DataTypes.INTEGER, allowNull: false },
        startsAt: { type: DataTypes.DATE, allowNull: false },
        endsAt: { type: DataTypes.DATE, allowNull: false },
        status: {
            type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
            allowNull: false,
            defaultValue: 'scheduled',
        },
        reasonText: DataTypes.TEXT,
        feeSnapshot: { type: DataTypes.INTEGER, allowNull: false },
        cancelledAt: DataTypes.DATE,
        cancelledBy: DataTypes.INTEGER,
        rescheduledFromId: DataTypes.INTEGER,
    }, {
        sequelize,
        modelName: 'Appointment',
    });

    return Appointment;
};