'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Appointments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      PatientId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'RESTRICT',
      },
      DoctorProfileId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'DoctorProfiles', key: 'id' }, onDelete: 'RESTRICT',
      },
      ClinicId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Clinics', key: 'id' }, onDelete: 'RESTRICT',
      },
      startsAt: { type: Sequelize.DATE, allowNull: false },
      endsAt: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      reasonText: { type: Sequelize.TEXT },
      feeSnapshot: { type: Sequelize.INTEGER, allowNull: false },
      cancelledAt: { type: Sequelize.DATE },
      cancelledBy: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' } },
      rescheduledFromId: { type: Sequelize.INTEGER, references: { model: 'Appointments', key: 'id' } },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX appointments_no_double_booking
      ON "Appointments" ("DoctorProfileId", "ClinicId", "startsAt")
      WHERE status IN ('scheduled', 'confirmed');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS appointments_no_double_booking;');
    await queryInterface.dropTable('Appointments');
  },
};