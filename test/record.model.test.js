//Require the dev-dependencies
let chai = require('chai');
let should = chai.should();
let expect = chai.expect;
let Record = require('../models/record');

const testRecord = new Record({
  name: "Quentin Drumez",
  picture: {
    url: "https://ucarecdn.com/5ddd2be8-f2d3-44c3-ae3e-2175d6ce6841/-/resize/180x180/"
  }
});

describe('Record - model - methods', () => {
  it('getFirstName should return first name', (done) => {
    let firstName = testRecord.getFirstName();
    expect(firstName).to.equal("Quentin");
    done();
  });

  it('getResizedPictureUrl should return resized picture url for uploadcare url', (done) => {
    let resizedUrl = testRecord.getResizedPictureUrl(193,189);
    expect(resizedUrl).to.equal("https://ucarecdn.com/5ddd2be8-f2d3-44c3-ae3e-2175d6ce6841/-/resize/193x189/");
    done();
  });
  
});

describe('Record - model - statics', () => {
  it('getNiceRecords should return nice records', (done) => {
    let badRecord = new Record({
      name: 'Jean Dupont'
    });

    let niceRecords = Record.getNiceRecords([badRecord, testRecord], 1, [{field: 'name', required: true}, {field: 'picture.url', required: true}]);
    expect(niceRecords).to.be.an('array').to.have.length(1);
    expect(niceRecords[0].name).to.be.equal("Quentin Drumez");

    let niceRecords2 = Record.getNiceRecords([badRecord, testRecord], 2, [{field: 'name', required: true}, {field: 'picture.url'}]);
    expect(niceRecords2).to.be.an('array').to.have.length(2, "niceRecords2 invalid length : " + niceRecords2.length);
    expect(niceRecords2[0].name).to.be.equal("Quentin Drumez"); // first one should be the best matching
    expect(niceRecords2[1].name).to.be.equal("Jean Dupont");
    done();
  });
});