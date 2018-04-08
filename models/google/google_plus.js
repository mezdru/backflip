var Record = require('../record.js');
var LinkHelper = require('../../helpers/link_helper.js');
var google = require('googleapis');
var urlParse = require('url-parse');
var undefsafe = require('undefsafe');

class GooglePlus {
  constructor(googleOAuth, record) {
    this.googleOAuth = googleOAuth;
    this.profile = {
      emails: [{"value": null, "type": "account" }]
    };
    this.record = record;
  }

  makeRecord(organisationId, callback) {
    this.getProfile(function(err, profile) {
      if (err) return callback(err);
      this.profile = profile;
      this.record = new Record({
        organisation: organisationId,
        tag: this.tag,
        type: 'person',
        name: this.name,
        picture: this.picture,
        google: this.google
      });
      this.makeLinks();
      return callback(null, this.record);
    }.bind(this));
  }

  get tag() {
    return Record.getTagFromEmail(this.accountEmail);
  }

  get name() {
    return this.profile.displayName || Record.getNameFromTag(this.tag);
  }

  get intro() {
    return this.profile.aboutMe || this.profile.tagline || this.profile.occupation;
  }

  get picture() {
    if (!undefsafe(this.profile, 'image.url')) return null;
    var urlObject = urlParse(this.profile.image.url, true);
    urlObject.set('query', null);
    return {url: urlObject.toString()};
  }

  makeLinks() {
    var links = [];
    this.record.addLink(LinkHelper.makeLink(this.accountEmail, 'email'));
    if (this.profile.url) this.record.addLink(LinkHelper.makeLink(this.profile.url, 'hyperlink'));
    if (this.profile.urls) this.profile.urls.forEach(url => this.record.addLink(LinkHelper.makeLink(url.value, 'hyperlink')));
    return this.record.links;
  }

  get google() {
    return {
      id: this.profile.id,
      primaryEmail: this.accountEmail,
      plus_updated: Date.now()
    };
  }

  get accountEmail() {
    return undefsafe(this.profile.emails.find(email => email.type === "account"), 'value') || this.profile.emails[0];
  }

  getProfile(callback) {
    google.plus('v1').people.get({userId: 'me', auth:this.googleOAuth}, callback);
  }
}

module.exports = GooglePlus;
