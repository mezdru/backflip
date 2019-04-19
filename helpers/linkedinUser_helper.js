"use strict";
let request = require('request');
let Record = require('../models/record');
let LinkHelper = require('../helpers/link_helper');
/**
 */
class LinkedinUserHelper {

	getLinkedinRecord(accessToken, organisationId) {
		return new Promise( (resolve, reject) => { 
			this.fetchLinkedinUser(accessToken)
			.then(linkedinUser => {
				console.log('link user')
				console.log(linkedinUser)
				return this.createRecord(linkedinUser, organisationId)
				.then(linkedinRecord => {
					console.log('linkedin record:  ')
					console.log(linkedinRecord)
					return resolve(linkedinRecord);
				}).catch(err => {
					console.log(err);
					return reject(err);
				});
			}).catch(err => {
				console.log(err);
				return reject(err);
			});
		});
	}

	fetchLinkedinUser(accessToken) {
		return new Promise ( (resolve, reject) => {request.get({
			url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/api/linkedin',
			json: true,
			headers: {
				'Authorization': 'Bearer ' + accessToken
			}
		}, (error, requestResponse, body) => {

			if(error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
				console.log('return error');
				return reject(error);
			}
			return resolve(body.linkedinUser);
		});});
	}

	createRecord(linkedinUser, organisationId) {
		return (new Record({
			organisation: organisationId,
			tag: Record.cleanTag(linkedinUser.email.split('@')[0], 'person'),
			name: linkedinUser.name,
			links: this.createLinks(linkedinUser)
		})).save();
	}

	createLinks(linkedinUser) {
		var links = [];
		if(linkedinUser.email) links.push(LinkHelper.makeLink(linkedinUser.email, 'email'));
		//@todo How to create Linkedin URL with linkedin id ?
		//if(linkedinUser.linkedinId) links.push(LinkHelper.makeLink('', 'linkedin'));
		return links;
	}

}

module.exports = new LinkedinUserHelper();