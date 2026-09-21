'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DoctorProfiles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      UserId: {
        type: Sequelize.INTEGER
      },
      SpecializationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Specializations',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      licenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      experienceYear: {
        type: Sequelize.INTEGER
      },
      consultationFee: {
        type: Sequelize.INTEGER
      },
      languages: {
        type: Sequelize.STRING
      },
      bio: {
        type: Sequelize.TEXT
      },
      verifiedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DoctorProfiles');
  }
};