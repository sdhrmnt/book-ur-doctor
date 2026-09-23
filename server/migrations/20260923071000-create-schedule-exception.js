'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScheduleExceptions', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      DoctorProfileId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'DoctorProfiles', key: 'id' },
      },
      ClinicId: {
        type: Sequelize.INTEGER,
        references: { model: 'Clinics', key: 'id' },
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      type: {
        type: Sequelize.ENUM('off', 'extra'),
        allowNull: false,
      },
      startTime: { type: Sequelize.TIME },
      endTime: { type: Sequelize.TIME },
      reason: { type: Sequelize.STRING },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // ERD.md §3 Check: type <> 'extra' OR (ClinicId IS NOT NULL AND startTime IS NOT NULL AND endTime IS NOT NULL)
    await queryInterface.sequelize.query(`
      ALTER TABLE "ScheduleExceptions"
        ADD CONSTRAINT schedule_exceptions_extra_requires_clinic_and_time
        CHECK ("type" <> 'extra' OR ("ClinicId" IS NOT NULL AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL));
    `);

    // ERD.md §3 Unique: (DoctorProfileId, date, type, startTime)
    await queryInterface.sequelize.query(`
      ALTER TABLE "ScheduleExceptions"
        ADD CONSTRAINT schedule_exceptions_unique_per_day_type_start
        UNIQUE ("DoctorProfileId", "date", "type", "startTime");
    `);

    // ERD.md §3 Index: (DoctorProfileId, date)
    await queryInterface.sequelize.query(`
      CREATE INDEX schedule_exceptions_doctor_profile_id_date
        ON "ScheduleExceptions" ("DoctorProfileId", "date");
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS schedule_exceptions_doctor_profile_id_date;');
    await queryInterface.sequelize.query('ALTER TABLE "ScheduleExceptions" DROP CONSTRAINT IF EXISTS schedule_exceptions_unique_per_day_type_start;');
    await queryInterface.sequelize.query('ALTER TABLE "ScheduleExceptions" DROP CONSTRAINT IF EXISTS schedule_exceptions_extra_requires_clinic_and_time;');
    await queryInterface.dropTable('ScheduleExceptions');
    // dropTable hanya membuang ENUM type kalau model-nya ter-load di sequelize instance;
    // migration jalan lewat queryInterface mentah, jadi di sini di-drop eksplisit supaya
    // migrate:undo lalu migrate ulang tidak gagal "type already exists".
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ScheduleExceptions_type";');
  },
};
