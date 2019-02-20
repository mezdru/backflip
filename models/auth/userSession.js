
let mongoose = require('mongoose');

// Client
var UserSessionSchema = mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  accessToken: {type: mongoose.Schema.Types.ObjectId, ref: 'AccessToken'},
  refreshToken: {type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', required: true},
  clientId: {type: String, required: true},
  userAgent: {type: String},
  userIP: {type: String},
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

UserSessionSchema.statics.findByAccessToken = function(aTokenId) {
  return this.findOne({accessToken: mongoose.Types.ObjectId(aTokenId)}).exec();
};

UserSessionSchema.statics.findByRefreshToken = function(rTokenId) {
  return this.findOne({refreshToken: mongoose.Types.ObjectId(rTokenId)}).exec();
};

UserSessionSchema.statics.findPopulatedObject = function(uSessionId) {
  return this.findById(uSessionId)
  .populate('accessToken', '_id created token')
  .populate('refreshToken', '_id created token')
  .exec();
};

UserSessionSchema.methods.updateAccessToken = function(aTokenId, uAgent) {
  this.accessToken = aTokenId;
  this.userAgent = uAgent;
  return this.save();
};

UserSessionSchema.pre('save', function(next) {
  this.updated = Date.now();
  return next();
});

var UserSession = mongoose.model('UserSession', UserSessionSchema);

module.exports = UserSession;