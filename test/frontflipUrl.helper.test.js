//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();
let expect = chai.expect;
let FrontflipUrlHelper = require('../helpers/frontflipUrl.helper');

chai.use(chaiHttp);


describe('Frontflip URL helper', () => {
  it('test with orgTag, path and locale', (done) => {
    let url = (new FrontflipUrlHelper('orgTag', '/onboard/intro/edit/@Quentin', 'en')).getUrl();
    url.should.be.a('string');
    expect(url).to.equal('http://localhost:3002/en/orgTag/onboard/intro/edit/@Quentin');
    done();
  });

  
})