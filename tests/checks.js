// IMPORTS
const path = require('path');
const Utils = require('./testutils');
const net = require('net');

const node_modules = path.resolve(path.join(__dirname, "../", "node_modules"));
const database = 'sqlite:db.sqlite';
const options = { logging: false};
var sequelize, User, Quiz;
const path_models = path.resolve(path.join(__dirname, "../model.js"));
const path_assignment = path.resolve(path.join(__dirname, "../"));

const T_TEST = 2 * 60; // Time between tests (seconds)
// CRITICAL ERRORS
let error_critical = null;

//TESTS
describe("(Prechecks) Entrega6_sockets_Dependencias", function () {

    this.timeout(T_TEST * 1000);

    it("(Precheck) Comprobando que las dependencias están instaladas...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrado el directorio '${node_modules}'`;
        this.msg_err = `No se encontró el directorio '${node_modules}'`;
        const fileexists = await Utils.checkFileExists(node_modules);
        if (!fileexists) {
            error_critical = this.msg_err;
        }
        fileexists.should.be.equal(true);
    });

});

describe("(Prechecks) Entrega6_sockets_Modelos", function () {

    this.timeout(T_TEST * 1000);

    before(function() {
        const { Sequelize } = require('sequelize');
        sequelize = new Sequelize(database, options);
    });

    it("(Precheck): Comprobando que la tabla Users existe en la base de datos...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrada la tabla Users en la base de datos '${database}'`;
        this.msg_err = `No se encontró la tabla Users en la base de datos '${database}'`;
        const res = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Users'");
        if (res[0].length !== 1) {
            error_critical = this.msg_err;
        }
        res[0].length.should.be.equal(1);
    });

    it("(Precheck): Comprobando que la tabla Quizzes existe en la base de datos...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrada la tabla Quizzes en la base de datos '${database}'`;
        this.msg_err = `No se encontró la tabla Quizzes en la base de datos '${database}'`;
        const res = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Quizzes'");
        if (res[0].length !== 1) {
            error_critical = this.msg_err;
        }
        res[0].length.should.be.equal(1);
    });

    it("(Precheck): Comprobando que la tabla Favourites existe en la base de datos...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrada la tabla Favourites en la base de datos '${database}'`;
        this.msg_err = `No se encontró la tabla Favourites en la base de datos '${database}'`;
        const res = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='Favourites'");
        if (res[0].length !== 1) {
            error_critical = this.msg_err;
        }
        res[0].length.should.be.equal(1);
    });

    it("(Precheck): Comprobando que existe el fichero de modelos...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrado el fichero '${path_models}'`;
        this.msg_err = `No se encontró el fichero '${path_models}'`;
        const fileexists = await Utils.checkFileExists(path_models);
        if (!fileexists) {
            error_critical = this.msg_err;
        }
        fileexists.should.be.equal(true);
    });

    it("(Precheck): Comprobando que existe el modelo User...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrado el modelo User`;
        this.msg_err = `No se encontró el modelo User`;
        const { User } = require(path_models).models;
        if (!User) {
            error_critical = this.msg_err;
        }
        User.should.not.be.undefined;
    });

    it("(Precheck): Comprobando que existe el modelo Quiz...", async function () {
        this.score = 0;
        this.msg_ok = `Encontrado el modelo Quiz`;
        this.msg_err = `No se encontró el modelo Quiz`;
        const { Quiz } = require(path_models).models;
        if (!Quiz) {
            error_critical = this.msg_err;
        }
        Quiz.should.not.be.undefined;
    });
});

describe("(Checks) Entrega6_sockets", function () {

    const spawn = require("child_process").spawn;
    const timeout = ms => new Promise(res => setTimeout(res, ms));
    const T_WAIT = 0.8; // Time between commands
    const number_of_quizzes = 5;
    const number_of_tries_to_check_random = 5;

    this.timeout(T_TEST * 1000);

    var added_quizzes = [];
    var added_users = [];
    let client = null;

    const host = "127.0.0.1";
    const port = 8080;

    before(async function() {
        const { Sequelize } = require('sequelize');
        sequelize = new Sequelize(database, options);
        User = require(path_models).models.User;
        Quiz = require(path_models).models.Quiz;

        let name = Utils.makeString(20);
        let age = Utils.makeInteger(0, 140);

        let u = await User.create( 
          { name, age }
        );

        added_users.push(u);

        let quizzes = await Quiz.findAll();

        if (quizzes.length < number_of_quizzes) {
            for (let i = 0; i < number_of_quizzes - quizzes.length; i++) {
                let question = Utils.makeString(20);
                let answer = Utils.makeString(20);
                let q = await Quiz.create( 
                  { question,
                    answer,
                    authorId: u.id
                  }
                );
                added_quizzes.push(q);
            }
        }
    });

    it(`1: Comprobando que el servidor en ${host} atiende conexiones en el puerto ${port}...`, async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            this.msg_ok = "El servidor atiende conexiones TCP correctamente";
            this.msg_err = "El servidor no atiende conexiones TCP correctamente";


            let error = "";

            client = spawn("node", ["main.js"], {cwd: path_assignment});
            client.on('error', function (data) {
                error += data;
            });
            await timeout(T_WAIT * 1000); //wait for client to start
            if (error) {
                this.msg_err = `Error arrancando el servidor: ${error}`;
                error.should.have.lengthOf(0);
            }
            let output = "";
            let telnet = null;

            telnet = new net.Socket();
            
            telnet.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente';
                error += data;
            });

            telnet.on('data', function (data) {
                output += data;
            });
            
            telnet.connect(port, host, function () {
            });

            await timeout(T_WAIT * 1000);

            if (telnet) {
                telnet.destroy();
            }
            if (client) {
                client.kill();
            }

            this.msg_err += '. ' + error;
            error.should.be.equal("");
          
        }
    });

    it(`2: Comprobando que el servidor ejecuta las acciones de manera remota...`, async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            this.msg_ok = "El servidor ejecuta las acciones de manera remota";
            this.msg_err = "El servidor no ejecuta las acciones de manera remota";


            let error = "";

            client = spawn("node", ["main.js"], {cwd: path_assignment});
            client.on('error', function (data) {
                error += data;
            });
            await timeout(T_WAIT * 1000); //wait for client to start
            if (error) {
                this.msg_err = `Error arrancando el servidor: ${error}`;
                error.should.have.lengthOf(0);
            }
            let output = "";
            let telnet = null;

            telnet = new net.Socket();
            
            telnet.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente';
                error += data;
            });

            telnet.on('data', function (data) {
                output += data;
            });
            
            telnet.connect(port, host, function () {
                telnet.write("u\n");
            });

            await timeout(T_WAIT * 1000);

            if (telnet) {
                telnet.destroy();
            }
            if (client) {
                client.kill();
            }

            this.msg_err += '. ' + error;
            error.should.be.equal("");

            Utils.search('years old', output).should.be.equal(true);
          
            Utils.search('UNSUPPORTED COMMAND', output).should.be.equal(false);
            Utils.search('TypeError', output).should.be.equal(false);

        }
    });

    it(`3: Comprobando que el servidor admite varias conexiones simultáneas...`, async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            this.msg_ok = "El servidor admite varias conexiones simultáneas";
            this.msg_err = "El servidor no admite varias conexiones simultáneas";


            let error = "";

            client = spawn("node", ["main.js"], {cwd: path_assignment});
            client.on('error', function (data) {
                error += data;
            });
            await timeout(T_WAIT * 1000); //wait for client to start
            if (error) {
                this.msg_err = `Error arrancando el servidor: ${error}`;
                error.should.have.lengthOf(0);
            }
            let output1 = "";
            let output2 = "";
            let telnet1 = null;
            let telnet2 = null;

            telnet1 = new net.Socket();
            
            telnet1.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente 1';
                error += data;
            });

            telnet1.on('data', function (data) {
                output1 += data;
            });
            
            telnet1.connect(port, host, function () {
                telnet1.write("u\n");
            });

            await timeout(T_WAIT * 1000);

            telnet2 = new net.Socket();
            
            telnet2.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente 2';
                error += data;
            });

            telnet2.on('data', function (data) {
                output2 += data;
            });
            
            telnet2.connect(port, host, function () {
                telnet2.write("u\n");
            });

            await timeout(T_WAIT * 1000);
            
            if (telnet1) {
                telnet1.destroy();
            }
            if (telnet2) {
                telnet2.destroy();
            }
            if (client) {
                client.kill();
            }

            this.msg_err += '. ' + error;
            error.should.be.equal("");

            Utils.search('years old', output1).should.be.equal(true);
            Utils.search('years old', output2).should.be.equal(true);

        }
    });

    it(`4: Comprobando que el servidor cierra correctamente las conexiones...`, async function () {
        this.score = 2.5;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            this.msg_ok = "El servidor cierra correctamente las conexiones";
            this.msg_err = "El servidor no cierra correctamente las conexiones";


            let error = "";

            client = spawn("node", ["main.js"], {cwd: path_assignment});
            client.on('error', function (data) {
                error += data;
            });
            await timeout(T_WAIT * 1000); //wait for client to start
            if (error) {
                this.msg_err = `Error arrancando el servidor: ${error}`;
                error.should.have.lengthOf(0);
            }
            let output1 = "";
            let telnet1 = null;
            let output2 = "";
            let telnet2 = null;

            telnet1 = new net.Socket();
            
            telnet1.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente';
                error += data;
            });

            telnet1.on('data', function (data) {
                output1 += data;
            });
            
            telnet1.connect(port, host, function () {
                telnet1.write("e\n");
            });

            await timeout(T_WAIT * 1000);


            telnet2 = new net.Socket();
            
            telnet2.on('error', function (data) {
                this.msg_err += 'Error conectando el cliente';
                error += data;
            });

            telnet2.on('data', function (data) {
                output2 += data;
            });
            
            telnet2.connect(port, host, function () {
                telnet2.write("u\n");
            });

            await timeout(T_WAIT * 1000);


            if (telnet1) {
                telnet1.destroy();
            }

            if (telnet2) {
                telnet2.destroy();
            }
            if (client) {
                client.kill();
            }

            if (error !== "") 
                this.msg_err += '. ¿Estás seguro de que sigue el servidor arrancado tras cerrar una conexión?';
            
            error.should.be.equal("");
            Utils.search('years old', output2).should.be.equal(true);
            Utils.search('UNSUPPORTED COMMAND', output2).should.be.equal(false);
            Utils.search('TypeError', output2).should.be.equal(false);

        }
    });

    afterEach(function () {
        if (client) {
            client.kill();
        }
    });

    after(async function() {
        const { Sequelize } = require('sequelize');
        sequelize = new Sequelize(database, options);
        User = require(path_models).models.User;
        Quiz = require(path_models).models.Quiz;

        added_quizzes.forEach( 
            async q => { 
                await q.destroy();
            }
        );

        added_users.forEach( 
            async u => { 
                await u.destroy();
            }
        );

    });
});