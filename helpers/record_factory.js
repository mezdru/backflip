/**
* @Author: Clément Dietschy <bedhed>
* @Date:   03-05-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 04-05-2017 06:47
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
    this.makeOutputFromInput();
    this.makeOutputFromOutputTags();
  }

  saveOutput(callback) {
    var result = {
      err: [],
      created: [],
      updated: []
    };
    this.output.forEach(
      function(record, index, output) {
        record.save(function(err, record) {
          console.log(record);
          if (err) result.err.push(err);
          else if (record.__v === 0) result.created.push(record.tag);
          else result.updated.push(record.tag);
          //@todo learn code and stop doing uggly shit like this
          if (result.err.length + result.created.length + result.updated.length == output.length)
          return callback(null, result);
        });
      }
    );
  }

  // First we take all the Objects in the input and convert them to Records
  makeOutputFromInput() {
    this.input.forEach(
      function(inputObject) {
        // To avoid calls to DB, we loaded all records locally to findLocally()
        var localRecord = this.findLocally(inputObject);
        var outputRecord = null;
        // We found a record, we merge the old Record with the new Object
        if (localRecord) outputRecord = localRecord.dumbMerge(inputObject);
        // We did not find a Record
        else {
          // Creating One
          outputRecord = Record.makeFromInputObject(inputObject);
          // Adding it to the local records so it can be found by findLocally()
          this.organisation.records.push(outputRecord);
        }
        this.output.push(outputRecord);
      }, this
    );
  }

  // Second we parse the description to create the Within Array
  // And convert it to record too.
  makeOutputFromOutputTags() {
    this.output.forEach(
      function(record) {
        this.output = this.output.concat(record.makeWithin(this.organisation));
        record.makeStructure(this.organisation);
        record.makeRanking(this.organisation);
      }, this
    );
  }

  findLocally(inputObject) {
    return this.organisation.records.find(record => record.tag === inputObject.tag);
  }

};

module.exports = RecordFactory;
