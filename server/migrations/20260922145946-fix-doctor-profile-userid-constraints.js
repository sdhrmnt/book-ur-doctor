'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('DoctorProfiles', 'UserId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addConstraint('DoctorProfiles', {
      fields: ['UserId'],
      type: 'unique',
      name: 'doctor_profiles_user_id_unique',
    });
    await queryInterface.addConstraint('DoctorProfiles', {
      fields: ['UserId'],
      type: 'foreign key',
      name: 'doctor_profiles_user_id_fkey',
      references: { table: 'Users', field: 'id' },
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('DoctorProfiles', 'doctor_profiles_user_id_fkey');
    await queryInterface.removeConstraint('DoctorProfiles', 'doctor_profiles_user_id_unique');
    await queryInterface.changeColumn('DoctorProfiles', 'UserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};