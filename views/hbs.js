/**
* @Author: Clément Dietschy <clement>
* @Date:   17-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 17-03-2017
* @Copyright: Clément Dietschy 2017
*/

var hbs = require('hbs');

hbs.registerHelper('raw', function(options) {
  return options.fn();
});

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

hbs.registerPartials(__dirname + '/partials');

module.exports = hbs;
