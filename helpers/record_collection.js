/**
* @Author: Clément Dietschy <bedhed>
* @Date:   03-05-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 02:09
* @Copyright: Clément Dietschy 2017
*/

var Record = require('../models/record.js');

var RecordCollection = class RecordCollection {

  constructor(organisation, user, records) {
    this.organisation = organisation;
    this.user = user;
    this.records = records || [];
  }

  addFromTag(tag) {

  }

  add(record) {
    this.records.push(record);
  }

};

module.exports = RecordCollection;
