var mongoose = require('mongoose');

var searchLogSchema = mongoose.Schema({
    organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    tags: [String],
    query: String,
    created: { type: Date, default: Date.now }
});

let SearchLog = mongoose.model('SearchLog', searchLogSchema);
module.exports = SearchLog;
