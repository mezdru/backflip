/**
* @Author: Clément Dietschy <bedhed>
* @Date:   23-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 05-05-2017 03:16
* @Copyright: Clément Dietschy 2017
*/

var undefsafe = require('undefsafe');
var LinkHelper = require('./link_helper.js');
var Record = require('../models/record.js');

var RecordObjectCSVHelper = class RecordObjectCSVHelper {

  static makeCSVsfromRecords(records) {
    let csv = records.map(function (record) {
      let helper = new RecordObjectCSVHelper(record);
      return helper.getCSV();
    });
    csv.unshift(RecordObjectCSVHelper.makeCSVHeader());
    return csv;
  }

  static makeRecordObjectfromCSV(csv, organisationId) {
    let helper = new RecordObjectCSVHelper(null, csv);
    return helper.getObject(organisationId);
  }

  constructor(record, csv) {
    this.record = record || {};
    this.csv = csv || {};
  }

  getCSV() {
    this.makeCSV();
    return this.csv;
  }

  getObject(organisationId) {
    this.makeObject(organisationId);
    return this.record;
  }

  static makeCSVHeader() {
    let csvHeader = {
      action: 'action',
      tag: 'tag',
      type: 'type',
      name: 'name',
      description: 'description',
      picture_url: 'picture_url',
    };
    for (let i=0; i<16; i++) {
      csvHeader[`link_${i}_type`] = `link_${i}_type`;
      csvHeader[`link_${i}_value`] = `link_${i}_value`;
    }
    return csvHeader;
  }

  makeCSV() {
    this.csv.action = '';
    this.csv.tag = this.record.tag;
    this.csv.type = this.record.type;
    this.csv.name = this.record.name;
    this.csv.description = this.record.description;
    this.csv.picture_url = undefsafe(this.record, 'picture.url');
    Object.assign(this.csv, this.getLinksForCSV());
  }

  //@todo make this return a record, why this pseudo-object nonsense ? (the action?)
  makeObject(organisationId) {
    this.record.action = this.csv.action || 'keep';
    this.record.type = this.csv.type;
    this.record.organisation = organisationId;
    this.record.name = this.csv.name;
    this.record.tag = this.csv.tag;
    this.record.picture = {};
    this.record.picture.url = this.csv.picture_url;
    this.record.description = this.csv.description;
    this.record.links = this.getLinksForObject();
  }

  getLinksForCSV() {
    let csvLinks = [];
    this.record.links.forEach(function (link, index) {
      this.csv[`link_${index}_type`] = link.type;
      if (['phone', 'home'].includes(link.type))
        this.csv[`link_${index}_value`] = link.display;
      else
        this.csv[`link_${index}_value`] = link.value;
    }, this);
  }

  getLinksForObject() {
    let objectLinks = [];
    for (var prop in this.csv) {
      let header = prop.split('_');
      if (this.csv[prop] && header[0] == 'link' && header[2] == 'value') {
        objectLinks.push(LinkHelper.makeLink(this.csv[`link_${header[1]}_value`], this.csv[`link_${header[1]}_type`]));
      }
    }
    return objectLinks;
  }

};

module.exports = RecordObjectCSVHelper;
