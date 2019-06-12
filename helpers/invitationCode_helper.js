"use strict";
let request = require('request');
/**
 */
class InvitationCodeHelper {

	fetchUsedInvitationCode(accessToken, organisationId) {
		return new Promise((resolve, reject) => {
			request.get({
				url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + `${process.env.HOST_AUTH}/api/invitation/code?organisation=${organisationId}&userAction=access`,
				json: true,
				headers: {
					'Authorization': `Bearer ${accessToken}`
				}
			}, (error, requestResponse, body) => {

				if (error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
					return reject(error);
				}
				return resolve(body.invitationCode);
			});
		});
	}

	createInvitationCode(accessToken, creatorId) {
		return new Promise((resolve, reject) => {
			request.post({
				url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + `${process.env.HOST_AUTH}/api/invitation/code?creator=${creatorId}`,
				json: true,
				headers: {
					'Authorization': `Bearer ${accessToken}`
				}
			}, (error, requestResponse, body) => {

				if (error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
					return reject(error);
				}
				return resolve(body.invitationCode);
			});
		});
	}

}

module.exports = new InvitationCodeHelper();