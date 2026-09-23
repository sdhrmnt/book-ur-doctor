'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Index lama salah: pakai ClinicId, tidak sesuai ERD.md §3
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS appointments_no_double_booking;`);

    // Satu dokter tidak boleh punya dua janji temu aktif di jam yang sama
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX one_active_appointment_per_doctor_slot
        ON "Appointments" ("DoctorProfileId", "startsAt")
        WHERE status IN ('scheduled', 'confirmed');
    `);

    // Satu pasien tidak boleh punya dua janji temu aktif di jam yang sama (E17)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX one_active_appointment_per_patient_slot
        ON "Appointments" ("PatientId", "startsAt")
        WHERE status IN ('scheduled', 'confirmed');
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Appointments"
        ADD CONSTRAINT appointments_endsat_after_startsat CHECK ("endsAt" > "startsAt");
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "Appointments" DROP CONSTRAINT IF EXISTS appointments_endsat_after_startsat;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS one_active_appointment_per_patient_slot;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS one_active_appointment_per_doctor_slot;`);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX appointments_no_double_booking
        ON "Appointments" ("DoctorProfileId", "ClinicId", "startsAt")
        WHERE status IN ('scheduled', 'confirmed');
    `);
  },
};