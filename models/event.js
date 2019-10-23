var mongoose = require('mongoose');

var eventSchema = mongoose.Schema({
  name: {type: String, required: true}, // search / contact / edit / view / ...
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
  emitter: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null},
  target: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null},
  data: {type: mongoose.Schema.Types.Mixed, default: {}},
  created: {type: Date, default: Date.now},
  owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
});

let Event = mongoose.model('Event', eventSchema);
module.exports = Event;
