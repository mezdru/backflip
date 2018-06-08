var Liana = require('forest-express-mongoose');
var User = require('../models/user.js');
var Record = require('../models/record.js');

Liana.collection('Organisation', {
  fields: [
    {
      field: 'logoUrl',
      type: 'String',
      get: function (object) {
        return object.logo.url;
      }
    },
    {
      field: 'userCount',
      type: 'Number',
      get: function (object) {
        return User.count({ 'orgsAndRecords.organisation': object._id }); // returns a Promise
      }
    },
    {
      field: 'MonthlyUserCount',
      type: 'Number',
      get: function (object) {
        return User.count({ 'orgsAndRecords.organisation': object._id , last_action: {$gte: Date.now() - 30*24*3600*1000}}); // returns a Promise
      }
    },
    {
      field: 'WeeklyUserCount',
      type: 'Number',
      get: function (object) {
        return User.count({ 'orgsAndRecords.organisation': object._id , last_action: {$gte: Date.now() - 7*24*3600*1000}}); // returns a Promise
      }
    },
    {
      field: 'DailyUserCount',
      type: 'Number',
      get: function (object) {
        return User.count({ 'orgsAndRecords.organisation': object._id , last_action: {$gte: Date.now() - 24*3600*1000}}); // returns a Promise
      }
    },
    {
      field: 'HashtagCount',
      type: 'Number',
      get: function (object) {
        return Record.count({ 'organisation': object._id , type: 'hashtag'}); // returns a Promise
      }
    },
    {
      field: 'PersonCount',
      type: 'Number',
      get: function (object) {
        return Record.count({ 'organisation': object._id , type: 'person'}); // returns a Promise
      }
    }
  ]
});
