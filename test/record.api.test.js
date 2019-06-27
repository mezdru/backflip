//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();

chai.use(chaiHttp);

describe('/GET home', () => {
  it('it should GET home page', (done) => {
    chai.request(server)
      .get('/')
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });
});

let access_token_superadmin;
let access_token_admin;
let access_token;

describe('/POST auth - locale', () => {

  it('it should auth the Superadmin', (done) => {
    chai.request('http://localhost:3001')
      .post('/locale')
      .send({
        client_id: process.env.DEFAULT_CLIENT_ID,
        client_secret: process.env.DEFAULT_CLIENT_SECRET,
        grant_type: 'password',
        username: 'quentin+a0002@wingzy.com',
        password: 'c1secret'
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.access_token.should.be.a('string');
        access_token_superadmin = res.body.access_token;
        done();
      });
  });

  it('it should auth the Admin', (done) => {
    chai.request('http://localhost:3001')
      .post('/locale')
      .send({
        client_id: process.env.DEFAULT_CLIENT_ID,
        client_secret: process.env.DEFAULT_CLIENT_SECRET,
        grant_type: 'password',
        username: 'quentin+a0002@wingzy.com',
        password: 'c1secret'
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.access_token.should.be.a('string');
        access_token_admin = res.body.access_token;
        done();
      });
  });

  it('it should auth the User', (done) => {
    chai.request('http://localhost:3001')
      .post('/locale')
      .send({
        client_id: process.env.DEFAULT_CLIENT_ID,
        client_secret: process.env.DEFAULT_CLIENT_SECRET,
        grant_type: 'password',
        username: 'quentin+a0002@wingzy.com',
        password: 'c1secret'
      })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.access_token.should.be.a('string');
        access_token = res.body.access_token;
        done();
      });
  });

});

describe('/GET records', () => {
  it('it should not GET records', (done) => {
    chai.request(server)
      .get('/api/records')
      .end((err, res) => {
        res.should.have.status(401);
        done();
      });
  });
  it('it should GET records', (done) => {
    chai.request(server)
      .get('/api/records')
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });
  it('it should GET records in organisation', (done) => {
    chai.request(server)
      .get('/api/records')
      .set('Authorization', 'Bearer ' + access_token_admin)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });
});