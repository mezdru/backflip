/**
 * @Author: Clément Dietschy <clement>
 * @Date:   21-06-2017 02:08
 * @Email:  clement@lenom.io
 * @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 29-06-2017 06:43
 * @Copyright: Clément Dietschy 2017
 */

var Record = require('../record.js');
var fullContact = require('fullcontact').createClient(process.env.FULLCONTACT_APIKEY);
var undefsafe = require('undefsafe');
var md5 = require('md5');
var LinkHelper = require('../../helpers/link_helper.js');

var FullContactRecord = class FullContactRecord {
    constructor(record) {
      this.record = record;
    }

    //@todo if not found iterate through links as identifiers for person, see https://www.npmjs.com/package/fullcontact#person
    query(callback) {
      var updated = undefsafe(this.record, 'fullcontact_updated');
      if (Date.parse(updated) > Date.now() - 30*24*3600*1000) {
        let err = new Error('Fullcontact found less than a month ago');
        err.status = 403;
        return callback(err);
      }
      var primaryEmail = this.record.google.primaryEmail || 'thisisnorealemail@notarealdomain.com';
      fullContact.person.md5(md5(primaryEmail), function(err, data) {
        if (data) return callback(null, data);
        // we found nothing, let's try a twitter search
        var handle = this.getTwitterHandle();
        if (handle) {
          fullContact.person.twitter(handle, function(err, data) {
            if (err) return callback(err);
            if (data) return callback(null, data);

            //@todo we could search by phone or facebook here too
            let customErr = new Error('Fullcontact found nothing');
            customErr.status = 404;
            return callback(customErr);
          }.bind(this));
        } else {
          if (err) return callback(err);
          let customErr = new Error('Fullcontact found nothing');
          customErr.status = 404;
          return callback(customErr);
        }
      }.bind(this));
    }

    enrich(callback) {
      if(this.record.type !== 'person') {
        let customErr = new Error('Not a person');
        customErr.status = 403;
        return callback(customErr);
      }
      this.query(function(err, data) {
        if (err) return callback(err);
        this.fullContactData = data;
        this.enrichPicture();
        this.enrichLinks();
        this.enrichAddress();
        this.touch();
        return this.record.save(callback);
      }.bind(this));
    }

    enrichPicture() {
      var picture_url = undefsafe(this.fullContactData, 'photos.0.url');
      if (picture_url && !this.record.picture.url) {
        this.record.picture.url = picture_url;
      }
    }

    enrichLinks() {
      if (this.fullContactData.socialProfiles)
        this.fullContactData.socialProfiles.forEach(function(profile) {
          if (FullContactRecord.isProfileTypeOk(profile.type)) {
            var link = LinkHelper.makeLink(profile.url);
            this.record.addLink(link);
          }
        }, this);
    }

    enrichAddress() {
      var address = undefsafe(this.fullContactData, 'demographics.locationDeduced.normalizedLocation');
      if (address) {
        var link = LinkHelper.makeLink(address);
        this.record.addLink(link);
      }
    }

    touch() {
      this.record.fullcontact_updated = Date.now();
    }

    static isProfileTypeOk(type) {
      var okTypes = ['facebook', 'flickr', 'github', 'google', 'instagram', 'linkedin', 'pinterest','skype','stackoverflow', 'tumblr', 'twitter', 'vimeo', 'youtube'];
      return okTypes.includes(type);
    }

    getTwitterHandle() {
      var handle = null;
      var link = this.record.links.find(link => link.type === 'twitter');
      if (link) {
        var splitLink = link.value.split('/');
        handle = splitLink[splitLink.length-1];
      }
      return handle;
    }


};

module.exports = FullContactRecord;
