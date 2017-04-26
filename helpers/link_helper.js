/**
* @Author: Clément Dietschy <bedhed>
* @Date:   23-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 23-04-2017 04:22
* @Copyright: Clément Dietschy 2017
*/

var validator = require('validator');
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var parseDomain = require('parse-domain');

var LinkHelper = class LinkHelper {

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
      case 'phone' : return this.makePhone();
      case 'hyperlink' : return this.makeHyperlink();
      case 'address' : return this.makeAddress();
      default : return this.makeCustom();
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
      this.phone = phoneUtil.parse(this.value, this.country);
      return phoneUtil.isPossibleNumber(this.phone);
    } catch (e) {
      //we do nothing here because phoneUtile.parse throws validation errors.
    }
  }

  makePhone () {
    this.value = phoneUtil.format(this.phone, PNF.E164);
    this.display = phoneUtil.format(this.phone, PNF.INTERNATIONAL);
  }

  isHyperlink () {
    return validator.isURL(this.value);
  }

  makeHyperlink () {
    var domain = parseDomain(this.value);
    switch (domain.domain) {
      case 'slack': this.type = 'slack'; this.display = 'Slack'; break;
      case 'bitbucket': this.type = 'bitbucket'; this.display = 'Bitbucket'; break;
      case 'dribbble': this.type = 'dribbble'; this.display = 'Dribbble'; break;
      case 'dropbox': this.type = 'dropbox'; this.display = 'Dropbox'; break;
      case 'facebook': this.type = 'facebook'; this.display = 'Facebook'; break;
      case 'flickr': this.type = 'flickr'; this.display = 'Flickr'; break;
      case 'foursquare': this.type = 'foursquare'; this.display = 'Foursquare'; break;
      case 'github': this.type = 'github'; this.display = 'Github'; break;
      case 'google':
        if (domain.subdomain == 'drive') {
          this.type = 'folder';
          this.display = 'Google Drive';
        } else if (domain.subdomain == 'docs') {
          this.type = 'file';
          this.display = 'Google Docs';
        } else if (domain.subdomain == 'plus') {
          type.type = 'google-plus';
          this.display = 'Google Plus';
        } else {
          this.type = 'google';
          this.display = 'Google';
        }
        break;
      case 'instagram': this.type = 'instagram'; this.display = 'Instagram'; break;
      case 'linkedin': this.type = 'linkedin'; this.display = 'LinkedIn'; break;
      case 'pinterest': this.type = 'pinterest'; this.display = 'Pinterest'; break;
      case 'renren': this.type = 'renren'; this.display = 'Renren'; break;
      case 'skype': this.type = 'skype'; this.display = 'Skype'; break;
      case 'stackoverflow': this.type = 'stack-overflow'; this.display = 'Stack Overflow'; break;
      case 'trello': this.type = 'trello'; this.display = 'Trello'; break;
      case 'tumblr': this.type = 'tumblr'; this.display = 'Tumblr'; break;
      case 'twitter': this.type = 'twitter'; this.display = 'Twitter'; break;
      case 'vimeo': this.type = 'vimeo'; this.display = 'Vimeo'; break;
      case 'vk': this.type = 'vk'; this.display = 'VK'; break;
      case 'weibo': this.type = 'weibo'; this.display = 'Weibo'; break;
      case 'xing': this.type = 'xing'; this.display = 'Xing'; break;
      case 'youtube': this.type = 'youtube'; this.display = 'Youtube'; break;
      case 'whatsapp': this.type = 'whatsapp'; this.display = 'WhatsApp'; break;
      default:  this.display = (domain.subdomain ? domain.subdomain + '.' : '') + domain.domain + '.' + domain.tld; break;
    }
  }

  makeCustom () {
    switch (this.type) {
      // For laruche.lenom.io
      case 'roadmap': this.type = 'road'; this.display = 'Roadmap'; break;
      case 'asana': this.type = 'map'; this.display = 'Asana'; break;
      case 'forum': this.type = 'comment'; this.display = 'Forum'; break;
      case 'home':
        if(this.isPhone()) {
          this.makePhone();
          this.type = 'home';
        }
        break;
    }
  }

  makeAddress () {
  }


};

module.exports = LinkHelper;
