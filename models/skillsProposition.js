var mongoose = require('mongoose');

var skillsPropositionSchema = mongoose.Schema({
    organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true, index: true},
    hashtags: [
      {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
    ],
    mailjetTrackingCode: String,
    status: {type: String, enum: ['in progress','accepted', 'refused'], default: 'in progress'},
    created: {type: Date, default: Date.now},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null}
});


skillsPropositionSchema.statics.createOne = function(skillsPropositionObject) {
  var skillsProposition = {
    organisation: skillsPropositionObject.organisation,
    hashtags: skillsPropositionObject.hashtags,
    sender: skillsPropositionObject.sender,
    recipient: skillsPropositionObject.recipient,
    owner: skillsPropositionObject.owner
  };

  return (new SkillsProposition(skillsProposition)).save();
}

skillsPropositionSchema.statics.findById = function(id) {
  return this.findOne({_id: id})
  .populate('recipient', '_id name tag links')
  .populate('sender', '_id tag name picture links intro')
  .populate('hashtags', '_id name name_translated tag picture')
  .populate('organisation', '_id name tag logo cover');
}

let SkillsProposition = mongoose.model('SkillsProposition', skillsPropositionSchema);
module.exports = SkillsProposition;
