/**
* @Author: Clément Dietschy <bedhed>
* @Date:   23-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 03:41
* @Copyright: Clément Dietschy 2017
*/

var undefsafe = require('undefsafe');

var RecordObjectCSVHelper = class RecordObjectCSVHelper {

  constructor(record, csv) {
    this.record = record || {};
    this.csv = csv || {};
  }

  getCSV() {
    this.makeCSV();
    return this.csv;
  }

  getObject() {
    this.makeObject();
    return this.record;
  }

  static makeCSVHeader() {
    let csvHeader = {
      action: 'action',
      _id: '_id',
      name: 'name',
      tag: 'tag',
      picture_url: 'picture_url',
      description: 'description',
    };
    for (let i=0; i<16; i++) {
      csvHeader[`link_${i}_type`] = `link_${i}_type`;
      csvHeader[`link_${i}_value`] = `link_${i}_value`;
    }
    return csvHeader;
  }

  makeCSV() {
    this.csv.action = this.record.action || 'keep';
    this.csv._id = this.record._id;
    this.csv.name = this.record.name;
    this.csv.tag = this.record.tag;
    this.csv.picture_url = undefsafe(this.record, 'picture.url');
    this.csv.description = this.record.description;
    Object.assign(this.csv, this.getLinksForCSV());
  }

  makeObject(organisationId) {
    this.record.action = this.csv.action || keep;
    this.record.id = this.csv._id;
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
      if (header[0] == 'link' && header[2] == 'type') {
        csvLinks.push({
          type: this.csv[`link_${header[1]}_type`],
          value: this.csv[`link_${header[1]}_value`]
        });
      }
    }
    return objectLinks;
  }

  static getCSVfromRecords(records) {
    let csv = records.map(function (record) {
      let helper = new RecordObjectCSVHelper(record);
      return helper.getCSV();
    });
    csv.unshift(RecordObjectCSVHelper.makeCSVHeader());
    return csv;
  }

};

module.exports = RecordObjectCSVHelper;
