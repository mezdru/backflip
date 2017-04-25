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
    return JSON.stringify(context, null, 4);
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkDisplay', function(link) {
  return link.display || link.value;
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkIcon', function(link) {
  switch (link.type) {
		case 'email':
			return 'fa-envelope-o';
		case 'address':
			return 'fa-map-marker';
    case 'hyperlink':
      return 'fa-link';
		default:
			return 'fa-'+link.type;
	}
});

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
hbs.registerHelper('linkUrl', function(link) {
  if (link.url) return link.url;
  if (link.uri) return link.uri;
	switch (link.type) {
		case 'email':
			return 'mailto:'+link.value;
    case 'phone':
      return 'tel'+link.value;
		case 'address':
			return 'http://maps.google.com/?q='+encodeURIComponent(link.value);
		default:
			return link.value;
	}
});

hbs.registerHelper('pictureUrl', function(picture) {
  if (!picture) {
		return "/images/placeholder.png";
	} else if (picture.path) {
		return "/images" + picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (picture.url) {
		return picture.url;
	} else {
		return "/images/placeholder.png";
  }
});

hbs.registerPartials(__dirname + '/partials');

module.exports = hbs;
