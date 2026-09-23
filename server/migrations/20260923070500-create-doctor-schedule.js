'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DoctorSchedules', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      DoctorProfileId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'DoctorProfiles', key: 'id' }, onDelete: 'CASCADE',
      },
      ClinicId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Clinics', key: 'id' },
      },
      dayOfWeek: { type: Sequelize.INTEGER, allowNull: false },
      startTime: { type: Sequelize.TIME, allowNull: false },
      endTime: { type: Sequelize.TIME, allowNull: false },
      slotDurationMinutes: { type: Sequelize.INTEGER, allowNull: false },
      effectiveFrom: { type: Sequelize.DATEONLY, allowNull: false },
      effectiveUntil: { type: Sequelize.DATEONLY },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // ERD.md §3 Check: dayOfWeek BETWEEN 0 AND 6
    await queryInterface.sequelize.query(`
      ALTER TABLE "DoctorSchedules"
        ADD CONSTRAINT doctor_schedules_day_of_week_range CHECK ("dayOfWeek" BETWEEN 0 AND 6);
    `);

    // ERD.md §3 Check: startTime < endTime
    await queryInterface.sequelize.query(`
      ALTER TABLE "DoctorSchedules"
        ADD CONSTRAINT doctor_schedules_start_before_end CHECK ("startTime" < "endTime");
    `);

    // ERD.md §3 Check: slotDurationMinutes > 0
    await queryInterface.sequelize.query(`
      ALTER TABLE "DoctorSchedules"
        ADD CONSTRAINT doctor_schedules_slot_duration_positive CHECK ("slotDurationMinutes" > 0);
    `);

    // ERD.md §3 Index: (DoctorProfileId, dayOfWeek)
    await queryInterface.sequelize.query(`
      CREATE INDEX doctor_schedules_doctor_profile_id_day_of_week
        ON "DoctorSchedules" ("DoctorProfileId", "dayOfWeek");
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS doctor_schedules_doctor_profile_id_day_of_week;');
    await queryInterface.sequelize.query('ALTER TABLE "DoctorSchedules" DROP CONSTRAINT IF EXISTS doctor_schedules_slot_duration_positive;');
    await queryInterface.sequelize.query('ALTER TABLE "DoctorSchedules" DROP CONSTRAINT IF EXISTS doctor_schedules_start_before_end;');
    await queryInterface.sequelize.query('ALTER TABLE "DoctorSchedules" DROP CONSTRAINT IF EXISTS doctor_schedules_day_of_week_range;');
    await queryInterface.dropTable('DoctorSchedules');
  },
};
