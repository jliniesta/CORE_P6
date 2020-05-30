
const {User, Quiz, Score} = require("./model.js").models;
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

// Show all quizzes in DB including <id> and <author>
exports.list = async (rl) =>  {

  let quizzes = await Quiz.findAll(
    { include: [{
        model: User,
        as: 'author'
      }]
    }
  );
  quizzes.forEach( 
    q => rl.log(`  "${q.question}" (by ${q.author.name}, id=${q.id})`)
  );
}

// Create quiz with <question> and <answer> in the DB
exports.create = async (rl) => {

  let name = await rl.questionP("Enter user");
    let user = await User.findOne({where: {name}});
    if (!user) throw new Error(`User ('${name}') doesn't exist!`);

    let question = await rl.questionP("Enter question");
    if (!question) throw new Error("Response can't be empty!");

    let answer = await rl.questionP("Enter answer");
    if (!answer) throw new Error("Response can't be empty!");

    await Quiz.create( 
      { question,
        answer, 
        authorId: user.id
      }
    );
    rl.log(`   User ${name} creates quiz: ${question} -> ${answer}`);
}

// Test (play) quiz identified by <id>
exports.test = async (rl) => {

  let id = await rl.questionP("Enter quiz Id");
  let quiz = await Quiz.findByPk(Number(id));
  if (!quiz) throw new Error(`  Quiz '${id}' is not in DB`);

  let answered = await rl.questionP(quiz.question);

  if (answered.toLowerCase().trim()===quiz.answer.toLowerCase().trim()) {
    rl.log(`  The answer "${answered}" is right!`);
  } else {
    rl.log(`  The answer "${answered}" is wrong!`);
  }
}

//Play
exports.play = async (rl) => {
  let score = 0; //Numero de preguntas acertadas
  const resolved = []; //Array con los id de los quizzes ya preguntados

  while (true){
    //elegir una pregunta al azar no repetida
    const where = {'id': {[Sequelize.Op.notIn]: resolved}};
    const count = await Quiz.count({where});

    if (!count) break;

    const quiz = await Quiz.findOne({
      where,
      offset: Math.floor(Math.random() * count),
      limit: 1
    });
    
    resolved.push(quiz.id);

    const answer = await rl.questionP(quiz.question);
    if (answer.toLowerCase().trim() !== quiz.answer.toLowerCase().trim()){
      rl.log(`The answer "${answer}" is wrong!`);
      break;
    }
    score++;
    rl.log(`The answer "${answer}" is right!`);
  }
  //Ver el resultado (score) final
  rl.log(`Score: ${score}`);

  //Preguntar el nombre del jugador
  const name = await rl.questionP("What is your name?");
  const [player] = await User.findOrCreate({where: {name}, defaults: {age: 0}});
  player.createScore({wins:score});

}

//Play
exports.scores = async (rl) => {
  const scores = await Score.findAll({
    order: [["wins", "DESC"]],
    include: [
      {model: User, as: "user"}
    ]
  });

  scores.forEach(score => {
    rl.log(`${score.user.name}|${score.wins}|${score.createdAt.toUTCString()}`);
  });
};

// Update quiz (identified by <id>) in the DB
exports.update = async (rl) => {

  let id = await rl.questionP("Enter quizId");
  let quiz = await Quiz.findByPk(Number(id));

  let question = await rl.questionP(`Enter question (${quiz.question})`);
  if (!question) throw new Error("Response can't be empty!");

  let answer = await rl.questionP(`Enter answer (${quiz.answer})`);
  if (!answer) throw new Error("Response can't be empty!");

  quiz.question = question;
  quiz.answer = answer;
  await quiz.save({fields: ["question", "answer"]});

  rl.log(`  Quiz ${id} updated to: ${question} -> ${answer}`);
}

// Delete quiz & favourites (with relation: onDelete: 'cascade')
exports.delete = async (rl) => {

  let id = await rl.questionP("Enter quiz Id");
  let n = await Quiz.destroy({where: {id}});
  
  if (n===0) throw new Error(`  ${id} not in DB`);
  rl.log(`  ${id} deleted from DB`);
}

