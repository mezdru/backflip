"use strict";
let request = require('request');
let Record = require('../models/record');
let LinkHelper = require('../helpers/link_helper');
/**
 */
class LinkedinUserHelper {

	getLinkedinRecord(accessToken, organisationId, linkedinUserId) {
		return new Promise( (resolve, reject) => { 
			this.fetchLinkedinUser(accessToken, linkedinUserId)
			.then(linkedinUser => {
				return this.createRecord(linkedinUser, organisationId)
				.then(linkedinRecord => {
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

	fetchLinkedinUser(accessToken, linkedinUserId) {
		return new Promise ( (resolve, reject) => {request.get({
			url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/api/linkedinUsers/' + linkedinUserId,
			json: true,
			headers: {
				'Authorization': 'Bearer ' + accessToken
			}
		}, (error, requestResponse, body) => {

			if(error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
				return reject(error || body);
			}
			return resolve(body.data);
		});});
	}

	createRecord(linkedinUser, organisationId) {
    return new Promise((resolve, reject) => {
      (new Record({
        organisation: organisationId,
        tag: Record.cleanTag(linkedinUser.email.split('@')[0], 'person'),
        type:'person',
        name: linkedinUser.name,
        links: this.createLinks(linkedinUser)
      })).save()
      .then(record => {
        if(linkedinUser.pictures && linkedinUser.pictures.length > 0) {
					let defaultPicture = linkedinUser.pictures.filter(picture => picture.type !== 'default');
          record.addPictureByUrlAsync((defaultPicture.length > 0 ? (defaultPicture[0].value).replace('/s50', '') : null))
          .then((pictureField) => {
            record.picture = pictureField.picture;
            record.save().then(() => {resolve(record)});
          })
          .catch(e => reject(e));
        } else {
          resolve(record);
        }
      }).catch(e => {reject(e)}); 
    })
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