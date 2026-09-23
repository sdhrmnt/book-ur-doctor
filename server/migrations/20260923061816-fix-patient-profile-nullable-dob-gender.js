'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('PatientProfiles', 'dateOfBirth', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.changeColumn('PatientProfiles', 'gender', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('PatientProfiles', 'dateOfBirth', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn('PatientProfiles', 'gender', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
