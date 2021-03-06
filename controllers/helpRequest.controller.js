var HelpRequest = require('../models/helpRequest');
var Record = require('../models/record');

// Check that the current User is allowed to access the org, then, that he owns the record or is admin / superadmin
exports.createSingleHelpRequest = async (req, res, next) => {
  let helpRequest = req.body.helpRequest;

  if(!helpRequest) {
    req.backflip = {status: 422, message: 'Missing body parameter: helpRequest <Object>'};
    return next();
  }

  if(!helpRequest.service || !HelpRequest.SERVICES.find(service => service === helpRequest.service)) {
    req.backflip = {status: 422, message: "The service wanted to process the request isn't implemented."};
    return next();
  }

  if(helpRequest.service === HelpRequest.SERVICE_EMAIL && helpRequest.recipients && helpRequest.recipients.length > 10) {
    req.backflip = {status: 422, message: 'The email service requires a maximum of 10 recipients'};
    return next();
  }

  helpRequest.owner = req.user._id;

  let tags = [];
  if(helpRequest.tags && helpRequest.tags.length > 0) {
    for(let i = 0; i < helpRequest.tags.length; i++) {
      let tagRecord = await Record.findByTagAsync(helpRequest.tags[i], req.organisation._id);
      if(tagRecord) tags.push(tagRecord);
    }
  }
  helpRequest.tags = tags;

  HelpRequest.createOne(helpRequest)
  .then(helpRequestObject => {
    req.backflip = {status: 200, message: 'Help request created with success.', data: helpRequestObject};
    return next();
  }).catch(e => {
    console.log(e);
    return next(e);
  });
}