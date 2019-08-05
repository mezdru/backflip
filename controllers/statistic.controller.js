var SearchLog = require('../models/search_log');

exports.createSingleSearchLog = async (req, res, next) => {
  let searchLog = req.body.searchLog;

  if(!searchLog || !searchLog.organisation || !searchLog.tags){
    req.backflip = {status: 422, message: 'Missing body parameter: tags [Array]'};
    return next();
  }

  (new SearchLog({
    organisation: searchLog.organisation,
    user: req.user._id,
    tags: searchLog.tags,
    query: searchLog.query,
    results: searchLog.results
  })).save()
  .then(searchLogSaved => {
    req.backflip = {status: 200, message: 'Search log created with success.', data: searchLogSaved};
    return next();
  }).catch(e => {
    console.log(e);
    return next(e);
  });
}