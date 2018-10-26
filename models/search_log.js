var mongoose = require('mongoose');

var searchLogSchema = mongoose.Schema({
    organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    tags: [String],
    query: String,
    created: { type: Date, default: Date.now }
});

searchLogSchema.statics.getSearchCounter = function(organisationId){
    return SearchLog.find({organisation: organisationId})
    .then(listOfSearchLog=>{
        return listOfSearchLog.length;
    });
}

let SearchLog = mongoose.model('SearchLog', searchLogSchema);
module.exports = SearchLog;
