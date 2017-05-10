/**
* @Author: Clément Dietschy <clement>
* @Date:   09-05-2017 04:31
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-05-2017 04:17
* @Copyright: Clément Dietschy 2017
*/

var UrlHelper = class UrlHelper {

  constructor(subdomains, path, query) {
    this.subdomains = subdomains || '';
    this.path = path || '';
    this.query = query || '';
  }

  getUrl () {
    this.makeUrl();
    return this.url;
  }

  makeUrl() {
    var url;
    if (this.isDev()) {
      if (this.subdomains) {
        if (this.query) this.query += `&subdomains=${this.subdomains}`;
        else this.query = `?subdomains=${this.subdomains}`;
      }
      this.url = `http://localhost:3000/${this.path}${this.query}`;
    } else {
      this.url =  `https://${subdomains}.lenom.io/${this.path}${this.query}`;
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
