var mongoose = require('mongoose');

const SERVICE_EMAIL = 'email';
const SERVICES = [SERVICE_EMAIL];

var helpRequestSchema = mongoose.Schema({
    organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true},
    recipients: [
      {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
    ],
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true},
    message: String,
    tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Record'}],
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

helpRequestSchema.statics.findById = function(id) {
  return this.findOne({_id: id})
  .populate('recipients', '_id name tag links')
  .populate('sender', '_id tag name picture links intro')
  .populate('tags', '_id name tag picture')
  .populate('organisation', '_id name tag logo cover');
}

helpRequestSchema.methods.tagsToString = function(locale) {
  if(!this.tags || this.tags.length === 0) return "";
  let tagsString = "";
  for(let i = 0; i < this.tags.length; i++) {
    let currentName = (this.tags[i].name_translated ? (this.tags[i].name_translated[locale] || this.tags[i].name_translated['en-UK']) || this.tags[i].name || this.tags[i].tag : this.tags[i].name || this.tags[i].tag);
    tagsString += (tagsString !== "" ? ", " : "") + currentName;
  }
  return tagsString;
}



let HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);
module.exports = HelpRequest;
