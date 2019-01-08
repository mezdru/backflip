"use strict";
let request = require('request');
let User = require('../models/user');

/**
 */
class AuthentificationHelper {

    constructor(accessToken, refreshToken){
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.getNewTokens = false;
        this.user = undefined;
        this.needClearCookies = false;
    }
    

    async performAuth() {
        this.needClearCookies = false;
        return this.isAccessTokenValid()
        .then(respAccess1 => {
            if(respAccess1) return this.user;
            this.isRefreshTokenValid()
            .then(respRefresh1 => {
                if(respRefresh1){
                    this.isAccessTokenValid().then(respAccess2 => {
                        return this.user;
                    });
                } else { return this.user;}
            });
        }).catch((err) => {return this.user;});
    }

    isAccessTokenValid(){
        return new Promise((resolve, reject) => {
            if(!this.accessToken) resolve(false);
            request.get({
                url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/isAuth',
                json: true,
                headers: {
                    'Authorization': 'Bearer ' + this.accessToken
                }
            }, (error, requestResponse, body) => {
                if(error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
                    return resolve(false);
                }       
                this.user = new User(body);
                return resolve(true);
            });
        });
    }

    isRefreshTokenValid(){
        return new Promise((resolve, reject) => {
            if(!this.refreshToken) resolve(false);
            request.post({
                url: (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') + process.env.HOST_AUTH + '/locale',
                json: true,
                body: {
                  client_id: process.env.DEFAULT_CLIENT_ID,
                  client_secret: process.env.DEFAULT_CLIENT_SECRET,
                  grant_type: 'refresh_token',
                  refresh_token: this.refreshToken
                }
            }, (error, requestResponse, body) => {
                if(error || (body && body.status && body.status !== 200) || (requestResponse.statusCode !== 200)) {
                    this.needClearCookies = true;
                    return resolve(false);
                }
                this.refreshToken = body.refresh_token;
                this.accessToken = body.access_token;
                this.getNewTokens = true;
                return resolve(true);
            });
        });
    }
}

module.exports = AuthentificationHelper;