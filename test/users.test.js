'use strict';
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe.only('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';
  this.timeout(5000);
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.createIndexes();
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('/api/users', function () {
    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('Missing \'username\' in request body');
          });
      });

      /**
       * COMPLETE ALL THE FOLLOWING TESTS
       */
      it('Should reject users with missing password', function () {
        const testUser = { username, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('Missing \'password\' in request body');
          });
      });

      it('Should reject users with non-string username', function () {
        const username = 1234;
        const testUser = { username, password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('incorrect field type: expected username to be string');
          });
      });

      it('Should reject users with non-string password', function () {
        const password = 1234;
        const testUser = { password, username, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('incorrect field type: expected password to be string');
          });
      });

      it('Should reject users with non-trimmed username', function () {
        const username = ' asdas';
        const testUser = { username, password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('password or username cannot start or end with whitespace');
          });
      });

      it('Should reject users with non-trimmed password', function () {
        const password = ' asfasfa';
        const testUser = { password, username, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('password or username cannot start or end with whitespace');
          });
      });

      it('Should reject users with empty username', function () {
        const username = '';
        const testUser = { username, password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('Must be at least 1 characters long');
            expect(res.body.location).to.eq('username');
            expect(res.body.reason).to.eq('ValidationError');
          });
      });

      it('Should reject users with password less than 8 characters', function () {
        const password = '2short';
        const testUser = { username, password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('Must be at least 8 characters long');
            expect(res.body.location).to.eq('password');
            expect(res.body.reason).to.eq('ValidationError');
          });
      });

      it('Should reject users with password greater than 72 characters', function () {
        const password = `munchtoolong1214121412141214121412
        14121412141214121412141214121412141214121412141214
        12141214121412141214121412141214121412141214121412
        14121412141214121412141214121412141214121412141214
        12141214121412141214121412141214121412141214121412
        141214121412141214121412141214`;
        const testUser = { username, password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.eq('Must be at most 72 characters long');
            expect(res.body.location).to.eq('password');
            expect(res.body.reason).to.eq('ValidationError');
          });
      });

      it('Should reject users with duplicate username', function () {
        return User.create({
          username,
          password,
          fullname
        })
          .then(() =>
            // Try to create a second user with the same username
            chai.request(app).post('/api/users').send({
              username,
              password,
              fullname
            })
          )
          .then(res => {
            expect(res).to.have.status(500);
            expect(res.body.message).to.eq('Username already taken');
            expect(res.body.error.reason).to.eq('ValidationError');
          });
      });

      // it('Should trim fullname');
    });

    describe('GET', function () {
      it('Should return an empty array initially', function () {
        return chai.request(app).get('/api/users')
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body).to.have.length(0);
          });
      });
      it('Should return an array of users', function () {
        const testUser0 = {
          username: `${username}`,
          password: `${password}`,
          fullname: ` ${fullname} `
        };
        const testUser1 = {
          username: `${username}1`,
          password: `${password}1`,
          fullname: `${fullname}1`
        };
        const testUser2 = {
          username: `${username}2`,
          password: `${password}2`,
          fullname: `${fullname}2`
        };

        chai.request(app).post('/api/users').send([testUser0, testUser1, testUser2]);
        return chai.request(app).get('/api/users')
          .then(res => {
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body).to.have.length(res.body.length);
            res.body.forEach(function (user) {
              expect(user).to.be.a('object');
              expect(user).to.have.keys('id', 'fullname', 'username');
            })
          })
      });
    });
  });
});