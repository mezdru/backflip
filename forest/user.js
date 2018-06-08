var Liana = require('forest-express-mongoose');

Liana.collection('User', {
  fields: [
    {
      field: 'loginEmail',
      type: 'String',
      get: function (object) {
        return object.loginEmail;
      }
    }
  ]
});
