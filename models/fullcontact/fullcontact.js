var Record = require('../record.js');
var fullContact = require('fullcontact').createClient(process.env.FULLCONTACT_APIKEY);
var undefsafe = require('undefsafe');
var merge = require('merge');
var unique = require('array-unique');
var md5 = require('md5');
var LinkHelper = require('../../helpers/link_helper.js');

class FullContact {
    constructor(record) {
      this.record = record;
      this.data = {
        photos: [],
        contactInfo: {
          chats: [],
          websites: [],
          fullName: null
        },
        socialProfiles: [],
        demographics: {
          locationDeduced: {
            normalizedLocation: null
          }
        }
      };
    }

    queryAll(callback) {
      var calls = this.record.links.map((link) => {
        if (this.isLinkGoodForQuery(link))
          return new Promise((resolve, reject) =>
          {
            this.query(link, (err, data) => {
              if (err) {
                console.error(err);
                return resolve();
              }
              else {
                this.mergeData(data);
                return resolve();
              }
            });
          });
      });
      Promise.all(calls).then(() => {
        this.cleanData();
        callback(null, this.data);
      }).catch(callback);
    }

    mergeData(data) {
      this.data.photos = this.data.photos.concat(data.photos || []);
      this.data.contactInfo.chats = this.data.contactInfo.chats.concat(undefsafe(data, 'contactInfo.chats') || []);
      this.data.contactInfo.websites = this.data.contactInfo.websites.concat(undefsafe(data, 'contactInfo.websites') || []);
      //@todo instead of picking the first one, what about picking the most likely ?
      this.data.contactInfo.fullName = this.data.contactInfo.fullName || undefsafe(data, 'contactInfo.fullName');
      this.data.demographics.locationDeduced.normalizedLocation = this.data.demographics.locationDeduced.normalizedLocation || undefsafe(data, 'demographics.locationDeduced.normalizedLocation');
      this.data.socialProfiles = this.data.socialProfiles.concat(undefsafe(data, 'socialProfiles') || []);
    }

    cleanData() {
      this.data.photos = this.reducer(this.data.photos, function (item) { return item.url === this.url; });
      this.data.contactInfo.chats = this.data.contactInfo.chats.filter(chat => FullContact.isChatTypeOk(chat.client));
      this.data.contactInfo.chats = this.reducer(this.data.contactInfo.chats, function (item) { return item.client === this.client && item.handle === this.handle; });
      this.data.contactInfo.websites = this.reducer(this.data.contactInfo.websites, function (item) { return item.url === this.url; });
      this.data.socialProfiles = this.data.socialProfiles.filter(profile => FullContact.isProfileTypeOk(profile.type));
      this.data.socialProfiles = this.reducer(this.data.socialProfiles, function (item) { return item.url === this.url; });
    }

    reducer(array, testFunction) {
      return array.reduce(function(accumulator, current) {
        if (accumulator.some(testFunction, current)) {
          return accumulator;
        } else {
          accumulator.push(current);
          return accumulator;
        }
      }, []);
    }

    query(link, callback) {
      switch (link.type) {
        case 'email': fullContact.person.md5(md5(link.value), callback); return;
        case 'twitter': fullContact.person.twitter(this.getTwitterHandleFromLink(link), callback); return;
        case 'phone': fullContact.person.phone(link.value, callback); return;
        default: return callback(`Cannot use ${link.type} for FullContact`);
      }
    }

    isLinkGoodForQuery(link) {
      return ['email','twitter','phone'].includes(link.type);
    }

    isRecent() {
      if (this.record.fullcontact_updated &&
      Date.parse(this.record.fullcontact_updated) > Date.now() - 30*24*3600*1000) return true;
    }

    enrich(callback) {
      if(this.record.type !== 'person') {
        let customErr = new Error('Not a person');
        customErr.status = 403;
        return callback(customErr);
      }
      if (this.isRecent()) {
        let err = new Error(`Fullcontact found less than a month ago for ${this.record._id}`);
        err.status = 418;
        return callback(err);
      }
      this.queryAll(function(err, data) {
        if (err) return callback(err);
        this.enrichIntro();
        this.enrichPicture();
        this.enrichAddress();
        this.enrichSocialProfiles();
        this.enrichChats();
        this.enrichWebsites();
        this.touch();
        this.record.addPictureByUrl(this.record.picture.url, function(err, record) {
          return record.save(callback);
        });
      }.bind(this));
    }

    enrichPicture() {
      if (this.record.hasPicture()) return;
      var photo = null;
      FullContact.okProfileTypes().forEach(function(type) {
        photo = photo || this.getPhoto(type);
      }, this);
      if (photo)
        this.record.picture = {
          url: photo.url,
          type: photo.type
        };
    }

    getPhoto(type) {
      return this.data.photos.find((photo) => photo.type === type);
    }

    //@todo add the the profiles by order of importance
    enrichSocialProfiles() {
      this.data.socialProfiles.forEach(function(profile) {
        this.record.addLink(LinkHelper.makeLink(profile.url, profile.type, profile.username));
      }, this);
    }

    enrichIntro() {
      if(this.record.intro) return;
      var linkedin = this.data.socialProfiles.find(profile => profile.type === 'linkedin');
      this.record.intro = undefsafe(linkedin, 'bio');
      if(this.record.intro) return;
      var twitter = this.data.socialProfiles.find(profile => profile.type === 'twitter');
      this.record.intro = undefsafe(twitter, 'bio');
    }

    enrichChats() {
      this.data.contactInfo.chats.forEach(function(chat) {
        this.record.addLink(LinkHelper.makeLink(null, chat.client, chat.handle));
      }, this);
    }

    enrichWebsites() {
      this.data.contactInfo.websites.forEach(function(website) {
        this.record.addLink(LinkHelper.makeLink(website.url, 'hyperlink'));
      }, this);
    }

    enrichAddress() {
      var address = undefsafe(this.data, 'demographics.locationDeduced.normalizedLocation');
      if (address) {
        this.record.addLink(LinkHelper.makeLink(address, 'address'));
      }
    }

    touch() {
      this.record.fullcontact_updated = Date.now();
    }

    static isProfileTypeOk(type) {
      return FullContact.okProfileTypes().includes(type);
    }

    //By order of preference
    static okProfileTypes() {
      return ['linkedin','google','twitter','github','skype','flickr','stackoverflow','facebook','vimeo','youtube','instagram','pinterest'];
    }

    static isChatTypeOk(type) {
      return FullContact.okChatTypes().includes(type);
    }

    static okChatTypes() {
      return ['skype','whatsapp', 'gtalk'];
    }

    getTwitterHandle() {
      var handle = null;
      var link = this.record.links.find(link => link.type === 'twitter');
      if (link) {
        handle = getTwitterHandleFromUrl(link);
      }
      return handle;
    }

    getTwitterHandleFromLink(link) {
      if (link.handle) return link.handle;
      var splitUrl = link.value.split('/');
      var path = splitUrl[splitUrl.length-1];
      var splitPath = path.split('?');
      var handle = splitPath[0];
      return handle;
    }
}

module.exports = FullContact;
