var validator = require('validator');
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
var PNF = require('google-libphonenumber').PhoneNumberFormat;
var parseDomain = require('parse-domain');
var urlParse = require('url-parse');

var LinkHelper = class LinkHelper {

  static makeLink(value, type, url, username, country) {
    return new LinkHelper(value, type, url, username, country).link;
  }

  constructor(value, type, url, username, display, country) {
    this.value = value;
    this.type = type;
    this.url = url;
    this.username = username;
    this.display = undefined;
    this.country = country || 'FR';
  }

  get link() {
    this.setType();
    this.makeLink();
    return {
      type: this.type,
      value: this.value,
      username: this.username,
      display: this.display,
      url: this.url
    };
  }

  setType(type) {
    if (!this.type) this.inferType();
  }

  inferType() {
    if (this.isEmail()) this.type = 'email';
    else if (this.isHyperlink()) this.type = 'hyperlink';
    else if (this.isPhone()) this.type = 'phone';
    else this.type = "address";
  }

  makeLink() {
    switch (this.type) {
      case 'email' : return this.makeEmail();

      case 'phone' : case 'home' : case 'landline' : return this.makePhone();

      case 'address' : return this.makeAddress();

      case 'linkedin': case 'twitter': case 'github': case 'facebook': case 'workplace':
      return this.makeProfile();

      case 'skype': case 'whatsapp': case 'gtalk': case 'workchat':
      return this.makeChat();

      default : return this.makeHyperlink();
    }
  }

  isEmail () {
    return validator.isEmail(this.value);
  }

  makeEmail () {
    this.value = validator.normalizeEmail(this.value, {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    });
    if (!this.value) this.makeError();
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
    } else this.makeError();
  }

  isHyperlink () {
    return validator.isURL(this.value);
  }

  cleanUrl() {
    var urlObject = urlParse(this.value, true);
    urlObject.set('protocol',  urlObject.protocol || 'https');
    urlObject.set('slashes', true);
    this.url = this.value = urlObject.toString();
  }

  //@todo too dumb to really work
  getUsernameFromUrl() {
    var urlObject = urlParse(this.url, true);
    return urlObject.pathname.split('/')[1];
  }

  makeProfile() {
    var domain = null;
    if (validator.isURL(this.value, {require_protocol: true})) {
      this.cleanUrl();
      domain = parseDomain(this.value);
      if(domain && domain.domain !== this.type) {
        this.type = 'hyperlink';
        return this.makeHyperlink();
      }
    } else {
      this.username = validator.escape(this.value);
      this.value = undefined;
      if (this.username && this.username.charAt(0) === '@') this.username = this.username.slice(1);
    }
    switch(this.type) {
      case 'linkedin': this.username = this.username || this.getUsernameFromUrl(); this.url = this.value = this.value || 'https://www.linkedin.com/in/'+this.username+'/'; this.display = 'LinkedIn'; return;
      case 'twitter': this.username = this.username || this.getUsernameFromUrl(); this.url = this.value = this.value || 'https://twitter.com/'+this.username; this.display = (this.username ? '@' + this.username : 'Twitter');  return;
      case 'github': this.username = this.username || this.getUsernameFromUrl(); this.url = this.value = this.value || 'https://github.com/'+this.username; this.display = this.username || 'Github';  return;
      case 'workplace': this.value = this.username; this.url = this.url || 'https://workplace.facebook.com/profile.php?id='+this.value; this.display = 'Workplace';return;
      case 'facebook': this.username = this.username || this.getUsernameFromUrl(); this.url = this.value = this.value || 'https://www.facebook.com/'+this.username; this.display = this.username || 'Facebook'; return;
      default: this.makeHyperlink();
    }
  }

  makeChat() {
    switch(this.type) {
      case 'skype': this.value = this.display = this.username || 'Skype'; return;
      case 'whatsapp': this.value = this.display = this.username || 'WhatsApp'; return;
      case 'workchat': this.url = this.url || 'https://workplace.facebook.com/chat/t/'+this.value; this.display = 'Workchat'; return;
      default: return this.makeError();
    }
  }

  //@todo some redundancies (google, twitter, fb, linkedin) with makeProfile
  makeHyperlink () {
    var domain = parseDomain(this.value);
    if (!domain) return this.makeLocation();
    this.cleanUrl();
    switch (domain.domain) {
      case 'slack': this.type = 'slack'; this.display = 'Slack'; return;
      case 'bitbucket': this.type = 'bitbucket'; this.display = 'Bitbucket'; return;
      case 'dribbble': this.type = 'dribbble'; this.display = 'Dribbble'; return;
      case 'dropbox': this.type = 'dropbox'; this.display = 'Dropbox'; return;
      case 'facebook':
        this.username = this.username || this.getUsernameFromUrl();
        if (domain.subdomain == 'www') {
          this.type = 'facebook';
          this.display = this.username || 'Facebook';
        } else {
          if (this.username == 'chat') {
            this.type = 'workchat';
            this.display = 'Workchat';
            this.username = undefined;
          } else {
            this.type = 'workplace';
            this.display = 'Workplace';
            this.username = undefined;
          }
        }
        return;
      case 'flickr': this.type = 'flickr'; this.display = 'Flickr'; return;
      case 'foursquare': this.type = 'foursquare'; this.display = 'Foursquare'; return;
      case 'github': this.username = this.username || this.getUsernameFromUrl(); this.type = 'github'; this.display = (this.username ? '@'+this.username : 'Github'); return;
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
      case 'twitter': this.username = this.username || this.getUsernameFromUrl(); this.type = 'twitter'; this.display = (this.username ? '@' + this.username : 'Twitter') || 'Twitter'; return;
      case 'vimeo': this.type = 'vimeo'; this.display = 'Vimeo'; return;
      case 'vk': this.type = 'vk'; this.display = 'VK'; return;
      case 'weibo': this.type = 'weibo'; this.display = 'Weibo'; return;
      case 'xing': this.type = 'xing'; this.display = 'Xing'; return;
      case 'youtube': this.type = 'youtube'; this.display = 'Youtube'; return;
      case 'whatsapp': this.type = 'whatsapp'; this.display = 'WhatsApp'; return;
      default:  this.display = (domain.subdomain && domain.subdomain !== 'www' ? domain.subdomain + '.' : '') + domain.domain + '.' + domain.tld; return;
    }
  }

  makeAddress () {
  }

  makeError () {
    this.type = 'error';
    this.country = undefined;
    this.value = undefined;
    this.username = undefined;
    this.display = undefined;
    this.url = undefined;
  }

  makeLocation () {
    this.type = 'location';
    this.username = undefined;
    this.display = undefined;
    this.url = 'https://www.google.com/maps?q='+this.value;
  }

};

module.exports = LinkHelper;
