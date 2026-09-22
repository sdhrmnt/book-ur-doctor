const { sequelize } = require('../models');

afterEach(async () => {
  await sequelize.query('TRUNCATE TABLE "DoctorProfiles", "PatientProfiles", "Users", "Specializations" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await sequelize.close();
});
