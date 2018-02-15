var Record = require('../record.js');
var LinkHelper = require('../../helpers/link_helper.js');
var google = require('googleapis');

class GooglePlus {
  constructor(googleOAuth) {
    this.googleOAuth = googleOAuth;
    this.profile = {
      emails: [{"value": null, "type": "account" }]
    };
  }

  getRecord(organisationId, callback) {
    this.getProfile(function(err, profile) {
      if (err) return callback(err);
      this.profile = profile;
      var record = this.makeRecord(organisationId);
      return callback(null, record);
    }.bind(this));
  }

  makeRecord(organisationId) {
    return new Record({
      organisation: organisationId,
      tag: this.tag,
      type: 'person',
      name: this.name,
      description: this.description,
      picture: this.picture,
      links: this.links,
      google: this.google
    });
  }

  get tag() {
    return Record.getTagFromEmail(this.accountEmail);
  }

  get name() {
    return this.profile.displayName || Record.getNameFromTag(this.tag);
  }

  get description() {
    return this.profile.aboutMe || this.profile.tagline || this.profile.occupation || '#empty';
  }

  get picture() {
    return {url: this.profile.image.url};
  }

  get links() {
    var links = [];
    links.push(LinkHelper.makeLink(this.accountEmail, 'email'));
    if (this.profile.url) links.push(LinkHelper.makeLink(this.profile.url, 'hyperlink'));
    if (this.profile.urls) this.profile.urls.forEach(url => links.push(LinkHelper.makeLink(url.value, 'hyperlink')));
    if (this.profile.placesLived) links.push(LinkHelper.makeLink(this.profile.placesLived.find(place => place.primary).value, 'address'));
    return links;
  }

  get google() {
    return {
      id: this.profile.id,
      primaryEmail: this.accountEmail,
      plus_updated: Date.now()
    };
  }

  get accountEmail() {
    var email = this.profile.emails.find(email => email.type === "account").value;
    if (!email) email = this.profile.emails[0];
    return email;
  }

  getProfile(callback) {
    google.plus('v1').people.get({userId: 'me', auth:this.googleOAuth}, callback);
  }
}

module.exports = GooglePlus;
