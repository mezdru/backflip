var mongoose = require('mongoose');

const SERVICES = ['email'];

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

helpRequestSchema.statics.SERVICES = SERVICES;

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



let HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);
module.exports = HelpRequest;
