var UrlHelper = class UrlHelper {

  static makeUrl(subdomains, path, query, locale) {
    return new UrlHelper(subdomains, path, query, locale).getUrl();
  }

  constructor(subdomains, path, query, locale) {
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
    //@todo This was made to create links with Wings tag in URL. Useless now?
    this.query = this.query.replace('#', '%23');
    this.path = this.path.replace('#', '%23');

    if (this.isProd()) {
      this.url =  `https://${this.subdomains ? this.subdomains + '.' : ''}${this.getHost()}/${this.locale ? this.locale + '/' : ''}${this.path}${this.query}`;
    } else {
      if (this.subdomains) {
        if (this.query) this.query += `&subdomains=${this.subdomains}`;
        else this.query = `?subdomains=${this.subdomains}`;
      }
      //@todo read the protocol, host & port from the request instead of hardcoding this shit
      if (this.isStaging()) {
        this.url = `https://${process.env.HOST}/${this.locale ? this.locale + '/' : ''}${this.path}${this.query}`;
      } else {
        this.url = `http://${this.getHost()}/${this.locale ? this.locale + '/' : ''}${this.path}${this.query}`;
      }
    }
  }

  isProd() {
    return this.getEnv() === 'production';
  }

  isStaging() {
    return this.getEnv() === 'staging';
  }

  getHost() {
    return process.env.HOST;
  }

  //@todo there must be a way to use app.get('env')
  getEnv() {
    return process.env.NODE_ENV;
  }

};


module.exports = UrlHelper;
