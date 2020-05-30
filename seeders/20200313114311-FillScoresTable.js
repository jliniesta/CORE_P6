'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Scores', [ //Mete en la tabla de usuario estos registros
      {
        wins: 0,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        wins: 0,
        userId: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        wins: 0,
        userId: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Scores', null, {});

  }
};
