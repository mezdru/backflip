var Record = require('../models/record');

exports.getRecords = async (req, res, next) => {
  Record.find({ ...req.query })
    .then(records => {
      if (records.length === 0) {
        req.backflip = { message: 'Records not found', status: 404 };
      } else {
        req.backflip = { message: 'Records found', status: 200, data: records };
      }
      return next();
    }).catch(err => { return next(err) });
}

exports.getSingleRecord = async (req, res, next) => {
  Record.findOne({ _id: req.params.id })
    .then(record => {
      if (!record) {
        req.backflip = { message: 'Record not found', status: 404 };
      } else {
        req.backflip = { message: 'Record found', status: 200, data: record };
      }
      return next();
    }).catch(err => { return next(err) });
}

exports.createSingleRecord = async (req, res, next) => {
  let record = req.body.record;
  if (!record.tag && record.name) {
    if (record.type === 'person') {
      record.tag = '@' + slug(uppercamelcase(record.name));
    } else {
      record.tag = '#' + slug(uppercamelcase(record.name));
    }
  }

  Record.makeFromTagAsync(record.tag, req.organisation._id)
    .then(recordSaved => {
      record.tag = recordSaved.tag; // tag can be modify
      record.name = record.name || recordSaved.name;
      Record.findOneAndUpdate({ '_id': recordSaved._id }, { $set: record }, { new: true })
        .then(recordUpdated => {
          Record.findOne({ _id: recordUpdated._id })
            .populate('hashtags', '_id tag type name name_translated picture')
            .populate('within', '_id tag type name name_translated picture')
            .then(recordPopulated => {
              req.backflip = { message: 'Record created with success', data: recordPopulated, status: 200 };
              return next();
            });
        }).catch(err => next(err));
    }).catch(err => next(err));
}

exports.createRecordLinks = async (req, res, next) => {
  Record.findOne({ _id: req.params.id })
    .populate('hashtags', '_id tag type name name_translated picture')
    .populate('within', '_id tag type name name_translated picture')
    .then(record => {
      if (!record) {
        req.backflip = { message: 'Record not found', status: 404 };
      } else {
        if (req.body.link) record.addLink(req.body.link);
        if (req.body.links) record.addLinks(req.body.links);
        await record.save()
          .then(() => { req.backflip = { message: 'Record links created with success.', status: 200, data: record } })
          .catch(err => next(err));
      }
      return next();
    }).catch(err => next(err));
}

exports.updateSingleRecord = async (req, res, next) => {

}

exports.deleteSingleRecord = async (req, res, next) => {

}