var HelpRequest = require('../models/helpRequest');

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

  helpRequest.owner = req.user._id;

  HelpRequest.createOne(helpRequest)
  .then(helpRequestObject => {

    // create agenda task to request the service after X seconds / minutes to know if the request is proccesed.

    req.backflip = {status: 200, message: 'Help request created with success.', data: helpRequestObject};
    return next();
  }).catch(e => {
    console.log(e);
    return next(e);
  });
}