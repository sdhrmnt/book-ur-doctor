'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.renameColumn('DoctorProfiles', 'experienceYear', 'experienceYears', { transaction });

      await queryInterface.sequelize.query(
        `ALTER TABLE "DoctorProfiles"
         ALTER COLUMN "languages" TYPE VARCHAR(255)[]
         USING CASE WHEN "languages" IS NULL THEN NULL ELSE ARRAY["languages"]::varchar[] END;`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE "DoctorProfiles"
         ALTER COLUMN "languages" TYPE VARCHAR(255)
         USING array_to_string("languages", ',');`,
        { transaction }
      );

      await queryInterface.renameColumn('DoctorProfiles', 'experienceYears', 'experienceYear', { transaction });
    });
  },
};
