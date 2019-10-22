"use strict";
let request = require('request');
/**
 */
class ClapHelper {
  notifyMerge(accessToken, recordFrom, recordTo) {
    return new Promise((resolve, reject) => {
      request.put({
        url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + `${process.env.HOST_RECOGNIZE}/api/claps/notify/merge`,
        json: true,
        body: {recordIdFrom: recordFrom._id, recordIdTo: recordTo._id},
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }, (error, requestResponse, body) => {
        if (error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
          return reject(error);
        }
        if (body && body.data) {
          return resolve(body.data);
        } else {
          return resolve([]);
        }
      });
    });
  }
}

module.exports = new ClapHelper();
