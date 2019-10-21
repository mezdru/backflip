//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();
let expect = chai.expect;

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

const testOrgId = "5d11f3c84a391408f428e821";
const otherTestOrgId = "5ce662e8f00bfa18bc8928b0";
const superadminRecordId = "5d134105840ec525c88d6d0e";
const adminRecordId = "5d14a94d31a40d2230837540";
const userRecordId = "5d14a845708dd821d0565b95";

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
        username: 'quentin+testadmin2@wingzy.com',
        password: 'c1testadmin'
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
        username: 'quentin+testuser@wingzy.com',
        password: 'c1test'
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
  it('it should not GET records (no auth)', (done) => {
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
  it('it should not GET records (no organisation)', (done) => {
    chai.request(server)
      .get(`/api/records`)
      .set('Authorization', 'Bearer ' + access_token_admin)
      .end((err, res) => {
        res.should.have.status(422);
        done();
      });
  });
});

describe('/GET record', () => {

  it('it should not GET record (no auth)', (done) => {
    chai.request(server)
      .get('/api/records/1234')
      .end((err, res) => {
        res.should.have.status(401);
        done();
      });
  });

  it('it should not GET record - invalid id', (done) => {
    chai.request(server)
      .get('/api/records/1234')
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(422);
        done();
      });
  });

  it('it should GET record (superadmin)', (done) => {
    chai.request(server)
      .get('/api/records/' + userRecordId)
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  it('it should GET record (admin)', (done) => {
    chai.request(server)
      .get('/api/records/' + userRecordId)
      .set('Authorization', 'Bearer ' + access_token_admin)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  it('it should GET record (user own)', (done) => {
    chai.request(server)
      .get('/api/records/' + userRecordId)
      .set('Authorization', 'Bearer ' + access_token)
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });

  it('it should not GET record (user does not own)', (done) => {
    chai.request(server)
      .get('/api/records/' + adminRecordId)
      .set('Authorization', 'Bearer ' + access_token)
      .end((err, res) => {
        res.should.have.status(403);
        done();
      });
  });

});

describe('POST record', () => {

  it('it should not POST record (no auth)', (done) => {
    chai.request(server)
      .post('/api/records')
      .end((err, res) => {
        res.should.have.status(401);
        done();
      });
  });

  it('it should not POST record (duplicate resource)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: testOrgId,
          name: 'Test Wings',
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(409);
        done();
      });
  });

  it('it should POST record (Superadmin)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: testOrgId,
          name: 'Test Wings' + Math.random(),
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        expect(res.body.data.tag.charAt(0)).to.equal('#');
        done();
      });
  });

  it('it should POST record (Admin)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: testOrgId,
          name: 'Test Wings' + Math.random(),
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token_admin)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        expect(res.body.data.tag.charAt(0)).to.equal('#');
        done();
      });
  });

  it('it should POST record (User)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: testOrgId,
          name: 'Test Wings' + Math.random(),
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        expect(res.body.data.tag.charAt(0)).to.equal('#');
        done();
      });
  });

  it('it should not POST record (Admin not allowed)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: otherTestOrgId,
          name: 'Test Wings' + Math.random(),
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token_admin)
      .end((err, res) => {
        res.should.have.status(403);
        done();
      });
  });

  it('it should not POST record (User not allowed)', (done) => {
    chai.request(server)
      .post('/api/records')
      .send({
        record: {
          organisation: otherTestOrgId,
          name: 'Test Wings' + Math.random(),
          type: 'hashtag',
          hidden: true
        }
      })
      .set('Authorization', 'Bearer ' + access_token)
      .end((err, res) => {
        res.should.have.status(403);
        done();
      });
  });

});

describe('PUT link', () => {

  it('it should PUT link (superadmin)', (done) => {
    chai.request(server)
      .put('/api/records/' + superadminRecordId + '/links/' + '5d15e37b5d8db9512441efb1')
      .send({
        link: {
          value: 'quentin+2@wingzy.com'
        }
      })
      .set('Authorization', 'Bearer ' + access_token_superadmin)
      .end((err, res) => {
        res.should.have.status(200);
        expect(res.body.data.value).to.equal('quentin+2@wingzy.com');
        expect(res.body.data._id).to.equal('5d15e37b5d8db9512441efb1');
        done();
      });
  });
  
});