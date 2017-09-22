/**
* @Author: Clément Dietschy <bedhed>
* @Date:   19-07-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 19-07-2017 07:13
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var applicationSchema = mongoose.Schema({
  email: String,
  ip: String,
  created: { type: Date, default: Date.now },
});

var Application = mongoose.model('Application', applicationSchema);

Application.validationSchema = {
  email: {
    isEmail: {
      errorMessage: 'Wrong email'
    }
  }
};

module.exports = Application;
