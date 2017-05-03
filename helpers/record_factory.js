/**
* @Author: Clément Dietschy <bedhed>
* @Date:   03-05-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 11:35
* @Copyright: Clément Dietschy 2017
*/

var Record = require('../models/record.js');

var RecordFactory = class RecordFactory {

  constructor(organisation, user) {
    this.organisation = organisation;
    this.user = user;
    // The Mongoose Records Documents to create
    this.output = [];
    // The Objects we got from reading CSV or Form
    this.input = [];
  }

  inputObject(recordObject) {
    this.input.push(recordObject);
  }

  makeOutput() {
    this.output = this.input.map(
      function(inputObject) {
        var localRecord = this.findLocally(inputObject);
        var outputRecord = null;
        if (localRecord) outputRecord = localRecord.merge(inputObject);
        else {
          outputRecord = Record.makeFromInputObject(inputObject);
          this.organisation.records.push(outputRecord);
        }
        return outputRecord;
      }, this
    );
  }

  findLocally(inputObject) {
    return this.organisation.records.find(record => record.tag === inputObject.tag);
  }

};

module.exports = RecordFactory;
