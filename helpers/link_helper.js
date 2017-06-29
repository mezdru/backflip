/**
* @Author: Clément Dietschy <bedhed>
* @Date:   23-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 29-06-2017 06:01
* @Copyright: Clément Dietschy 2017
*/

var validator = require('validator');
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var parseDomain = require('parse-domain');

var LinkHelper = class LinkHelper {

  static makeLink(value, type, country) {
    return new LinkHelper(value, type, country).link;
  }

  constructor(value, type, country) {
    this.country = country || 'FR';
    this.value = value;
    this.type = type;
    this.display = undefined;
    this.url = undefined;
  }

  get link() {
    this.setType();
    this.makeLink();
    return {
      type: this.type,
      value: this.value,
      display: this.display,
      url: this.url
    };
  }

  setType(type) {
    if (type) this.type = type;
    else if (!this.type) this.inferType();
  }

  inferType() {
    if (this.isEmail()) this.type = 'email';
    else if (this.isPhone()) this.type = 'phone';
    else if (this.isHyperlink()) this.type = 'hyperlink';
    else this.type = "address";
  }

  makeLink() {
    switch (this.type) {
      case 'email' : return this.makeEmail();
      case 'phone' : case 'home' : return this.makePhone();
      case 'address' : return this.makeAddress();
      default : return this.makeHyperlink();
    }
  }

  isEmail () {
    return validator.isEmail(this.value);
  }

  makeEmail () {
    this.value = validator.normalizeEmail(this.value);
  }

  //@todo so this try..catch is here to silence phoneUtil.parser errors... now THAT'S ugly.
  isPhone () {
    try {
      this.phone = this.phone || phoneUtil.parse(this.value, this.country);
      return phoneUtil.isPossibleNumber(this.phone);
    } catch (e) {
      //we do nothing here because phoneUtile.parse throws validation errors.
    }
  }

  makePhone () {
    if (this.isPhone()) {
      this.value = phoneUtil.format(this.phone, PNF.E164);
      this.display = phoneUtil.format(this.phone, PNF.INTERNATIONAL);
    }
  }

  isHyperlink () {
    return validator.isURL(this.value);
  }

  makeHyperlink () {
    switch (this.type) {
      // For laruche.lenom.io
      case 'road': this.display = 'Roadmap'; return;
      case 'map': this.display = 'Asana'; return;
      case 'comment': this.display = 'Forum'; return;
    }
    var domain = parseDomain(this.value);
    if (!domain) return;
    switch (domain.domain) {
      case 'slack': this.type = 'slack'; this.display = 'Slack'; return;
      case 'bitbucket': this.type = 'bitbucket'; this.display = 'Bitbucket'; return;
      case 'dribbble': this.type = 'dribbble'; this.display = 'Dribbble'; return;
      case 'dropbox': this.type = 'dropbox'; this.display = 'Dropbox'; return;
      case 'facebook': this.type = 'facebook'; this.display = 'Facebook'; return;
      case 'flickr': this.type = 'flickr'; this.display = 'Flickr'; return;
      case 'foursquare': this.type = 'foursquare'; this.display = 'Foursquare'; return;
      case 'github': this.type = 'github'; this.display = 'Github'; return;
      case 'google':
        if (domain.subdomain == 'drive') {
          this.type = 'folder';
          this.display = 'Google Drive';
        } else if (domain.subdomain == 'docs') {
          this.type = 'file';
          this.display = 'Google Docs';
        } else if (domain.subdomain == 'plus') {
          this.type = 'google-plus';
          this.display = 'Google Plus';
        } else {
          this.type = 'google';
          this.display = 'Google';
        }
        return;
      case 'instagram': this.type = 'instagram'; this.display = 'Instagram'; return;
      case 'linkedin': this.type = 'linkedin'; this.display = 'LinkedIn'; return;
      case 'pinterest': this.type = 'pinterest'; this.display = 'Pinterest'; return;
      case 'renren': this.type = 'renren'; this.display = 'Renren'; return;
      case 'skype': this.type = 'skype'; this.display = this.value; return;
      case 'stackoverflow': this.type = 'stack-overflow'; this.display = 'Stack Overflow'; return;
      case 'trello': this.type = 'trello'; this.display = 'Trello'; return;
      case 'tumblr': this.type = 'tumblr'; this.display = 'Tumblr'; return;
      case 'twitter': this.type = 'twitter'; this.display = 'Twitter'; return;
      case 'vimeo': this.type = 'vimeo'; this.display = 'Vimeo'; return;
      case 'vk': this.type = 'vk'; this.display = 'VK'; return;
      case 'weibo': this.type = 'weibo'; this.display = 'Weibo'; return;
      case 'xing': this.type = 'xing'; this.display = 'Xing'; return;
      case 'youtube': this.type = 'youtube'; this.display = 'Youtube'; return;
      case 'whatsapp': this.type = 'whatsapp'; this.display = 'WhatsApp'; return;
      default:  this.display = (domain.subdomain ? domain.subdomain + '.' : '') + domain.domain + '.' + domain.tld; return;
    }
  }

  makeAddress () {
  }


};

module.exports = LinkHelper;
