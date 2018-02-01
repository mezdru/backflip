var mongoose = require('mongoose');

var applicationSchema = mongoose.Schema({
  email: String,
  ip: String,
  created: { type: Date, default: Date.now },
});

applicationSchema.statics.getValidationSchema = function (res) {
  return {
    email: {
      isEmail: {
        errorMessage: res.__('Wrong email')
      }
    }
  };
};

var Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
