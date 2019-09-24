var mongoose = require('mongoose');

const SERVICE_EMAIL = 'email';

var helpRequestSchema = mongoose.Schema({
    organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true},
    recipients: [
      {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
    ],
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true},
    message: String,
    tags: [String],
    query: String,
    results: Number,
    service: {type: String, enum: SERVICES},
    trackingCodes: [String],
    status: {type: String, enum: ['processing','sent'], default: 'processing'},
    solved: {type: Boolean, default: false},
    created: {type: Date, default: Date.now},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
});

helpRequestSchema.statics.SERVICE_EMAIL = SERVICE_EMAIL;
helpRequestSchema.statics.SERVICES = [SERVICE_EMAIL];

helpRequestSchema.statics.createOne = function(helpRequestObject) {
  var helpRequest = {
    organisation: helpRequestObject.organisation,
    recipients: helpRequestObject.recipients,
    sender: helpRequestObject.sender,
    message: helpRequestObject.message,
    tags: helpRequestObject.tags,
    query: helpRequestObject.query,
    results: helpRequestObject.results,
    service: helpRequestObject.service,
    owner: helpRequestObject.owner
  };

  return (new HelpRequest(helpRequest)).save();
}

helpRequestSchema.statics.findById = function(id) {
  return this.findOne({_id: id})
  .populate('recipients', '_id name tag links')
  .populate('sender', '_id tag name picture links')
  .populate('organisation', '_id name tag logo cover');
}



let HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);
module.exports = HelpRequest;
