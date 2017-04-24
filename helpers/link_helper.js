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

var LinkHelper = class LinkHelper {

  constructor(value, country, type) {
    this.value = value;
    this.country = country || 'FR';
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
      default : return this.makeAddress();
    }
  }

  isEmail () {
    console.log('VALIDATOR: '+validator.isEmail(this.value));
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
  }

  makeAddress () {

  }


};

module.exports = LinkHelper;
