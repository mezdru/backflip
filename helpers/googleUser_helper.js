"use strict";
let request = require('request');
let Record = require('../models/record');
let LinkHelper = require('../helpers/link_helper');
/**
 */
class GoogleUserHelper {

	getGoogleRecord(accessToken, organisationId) {
		return new Promise( (resolve, reject) => { 
			this.fetchGoogleUser(accessToken)
			.then(googleUser => {
				return this.createRecord(googleUser, organisationId)
				.then(googleRecord => {
					return resolve(googleRecord);
				}).catch(err => {
					return reject(err);
				});
			}).catch(err => {
				return reject(err);
			});
		});
	}

	fetchGoogleUser(accessToken) {
		return new Promise ( (resolve, reject) => {request.get({
			url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/api/google',
			json: true,
			headers: {
				'Authorization': 'Bearer ' + accessToken
			}
		}, (error, requestResponse, body) => {

			if(error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
				return reject(error);
			}
			return resolve(body.data);
		});});
	}

	createRecord(googleUser, organisationId) {
    return new Promise((resolve, reject) => {
      (new Record({
        organisation: organisationId,
        tag: Record.cleanTag(googleUser.email.split('@')[0], 'person'),
        type:'person',
        name: googleUser.name,
        links: this.createLinks(googleUser)
      })).save()
      .then(record => {
        if(googleUser.pictures && googleUser.pictures.length > 0) {
					let defaultPicture = googleUser.pictures.filter(picture => picture.type !== 'default');
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

	createLinks(googleUser) {
		var links = [];
		if(googleUser.email) links.push(LinkHelper.makeLink(googleUser.email, 'email'));
		return links;
	}

}

module.exports = new GoogleUserHelper();