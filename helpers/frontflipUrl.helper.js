var FrontflipUrlHelper = class FrontflipUrlHelper {

  static makeUrl(orgTag, path, locale) {
    return new FrontflipUrlHelper(orgTag, path, locale).getUrl();
  }

  constructor(orgTag, path, locale) {
    this.orgTag = orgTag || '';
    this.path = path || '';
    this.locale = locale || '';
  }

  getUrl () {
    this.makeUrl();
    return this.url;
  }

  makeUrl() {
    this.path = this.path.replace('#', '%23');

    if(process.env.NODE_ENV === 'development') this.url = 'http://';
    else this.url = 'https://';

    this.url += `${process.env.HOST_FRONTFLIP}/${this.locale}/${this.orgTag}${this.path}`;

  }

};


module.exports = FrontflipUrlHelper;
