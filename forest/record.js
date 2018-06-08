var Liana = require('forest-express-mongoose');
var Record = require('../models/record.js');

Liana.collection('Record', {
  fields: [
    {
      field: 'recordCount',
      type: 'Number',
      get: function (object) {
        return Record.count({$or:[{'within': object._id}, {'hashtags': object._id}]}); // returns a Promise
      }
    }
  ]
});
