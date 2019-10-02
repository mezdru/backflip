"use strict";
let request = require('request');
/**
 */
class ConnectionLogHelper {
  getConnectionLogs(accessToken) {
    return new Promise((resolve, reject) => {
      request.get({
        url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + `${process.env.HOST_AUTH}/api/connectionLogs`,
        json: true,
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

module.exports = new ConnectionLogHelper();
