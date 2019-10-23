let Event = require('../models/event');
let Organisation = require('../models/organisation');
let Record = require('../models/record');

exports.createSingleEvent = async (req, res, next) => {
  if(!req.body.event) {
    req.backflip = {status: 422, message: "Missing event object"};
    return next();
  }

  if(req.body.event.organisation) {
    let organisation = await Organisation.findOne({_id: req.body.event.organisation}).catch(e => null);
    if(!organisation) {
      req.backflip = {status: 422, message: "Unknown organisation ID"};
      return next();
    }
  }

  if(req.body.event.emitter) {
    let emitter = await Record.findOne({_id: req.body.event.emitter}).catch(e => null);
    if(!emitter) {
      req.backflip = {status: 422, message: "Unknown emitter ID"};
      return next();
    }
  }

  if(req.body.event.target) {
    let target = await Record.findOne({_id: req.body.event.target}).catch(e => null);
    if(!target) {
      req.backflip = {status: 422, message: "Unknown target ID"};
      return next();
    }
  }

  let eventSaved = await (new Event(req.body.event)).save()
  .catch(e => {return next(e)});
  
  req.backflip = {status: 200, data: eventSaved, message: "Event created with success."};
  return next();
}