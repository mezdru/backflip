/**
* @Author: Clément Dietschy <clement>
* @Date:   09-05-2017 04:31
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 02-06-2017 05:47
* @Copyright: Clément Dietschy 2017
*/

var UrlHelper = class UrlHelper {

  constructor(subdomains, path, query, locale) {
    console.log("sub: "+subdomains);
    this.subdomains = subdomains || '';
    this.path = path || '';
    this.query = query || '';
    this.locale = locale || '';
  }

  getUrl () {
    this.makeUrl();
    return this.url;
  }

  makeUrl() {
    if (this.isDev()) {
      if (this.subdomains) {
        if (this.query) this.query += `&subdomains=${this.subdomains}`;
        else this.query = `?subdomains=${this.subdomains}`;
      }
      this.url = `http://localhost:3000/${this.locale ? this.locale + '/' : ''}${this.path}${this.query}`;
    } else {
      this.url =  `https://${this.subdomains ? this.subdomains + '.' : ''}lenom.io/${this.locale ? this.locale + '/' : ''}${this.path}${this.query}`;
    }
  }

  isDev() {
    return this.getEnv() === 'development';
  }

  //@todo there must be a way to use app.get('env')
  getEnv() {
    return process.env.NODE_ENV;
  }

};


module.exports = UrlHelper;
