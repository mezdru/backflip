/**
* @Author: Clément Dietschy <bedhed>
* @Date:   03-05-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 07:09
* @Copyright: Clément Dietschy 2017
*/

var Record = require('../models/record.js');

var RecordCollection = class RecordCollection {

  constructor(organisation, user, records) {
    this.organisation = organisation;
    this.user = user;
    this.recordDocs = [];
    this.recordObjects = [];
  }

  get records() {
    return this.recordDocs;
  }

  addRecordObject(recordObject) {
    this.recordObjects.push(recordObject);
  }

  makeRecords(allRecords) {
    this.recordDocs = this.recordObjects.map(
      function(recordObject) {
        return Record.extractOrMakeFromRecordObject(recordObject, allRecords);
      }
    );
  }

};

module.exports = RecordCollection;
