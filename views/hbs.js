var hbs = require('hbs');
var errors = require('./errors.json');
var UrlHelper = require('../helpers/url_helper.js');

hbs.registerHelper('__', function () {
  return this.__.apply(this, arguments);
});

hbs.registerHelper('locale', function() {
  return this.getLocale();
});

hbs.registerHelper('raw', function(options) {
  return options.fn();
});

hbs.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 4);
});

hbs.registerHelper('textfieldJson', function(context) {
  text = '[\n';
  context.forEach(branch => text += JSON.stringify(branch) + ',\n');
  text = text.replace(/,\n$/, '\n');
  text += ']';
  return text;
});

hbs.registerHelper('coverStyle', function(coverUrl) {
  var html = '';
  if(coverUrl) {
    html += 'class="image-preview-single"';
    if (coverUrl !== true) {
      html += 'style="background-image:url(' +
        coverUrl +
        ')"';
    }
  }
  return html;
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
      return 'tel:'+link.value;
		case 'address':
			return 'http://maps.google.com/?q='+encodeURIComponent(link.value);
		default:
			return link.value;
	}
});

hbs.registerHelper('pictureUrl', function(picture, type) {
  if (picture && picture.url) {
			return picture.url;
	} else if (picture && picture.path) {
		return "/images" + picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (picture && picture.uri) {
		return picture.uri;
	} else {
		switch (type) {
			case 'hashtag' : return "/images/placeholder_hashtag.png";
			default: case 'person' : return "/images/placeholder_person.png";
		}
	}
});

hbs.registerHelper('profilePicture', function(user, organisation) {
  if(!user || !organisation || !organisation._id) return hbs.handlebars.helpers.picture.apply(this, {type: 'person', picture: {}});
  return hbs.handlebars.helpers.picture.apply(this, [user.getRecord(organisation._id)]);
});

hbs.registerHelper('picture', function(item) {
  if (!item) item = {picture: {}, type: 'person'};
  var url = hbs.handlebars.helpers.pictureUrl.apply(this, [item.picture || {}, item.type || 'person']);
  if (url) return '<img src="'+url+'">';
  else return null;
});

var twemoji = require('twemoji');
hbs.registerHelper('icon', function(item) {
  if (item && item.picture && item.picture.emoji)
    return twemoji.parse(item.picture.emoji, {ext: '.svg', folder: 'svg',});
  if (item && item.picture && item.picture.path)
    return '<img src="/images'+item.picture.path+'">';
  else return '';
  //else return '<img src="/images/placeholder_hashtag.png">';
});

hbs.registerHelper('error', function(status, elem) {
  error = errors.find(error => error.status == status || error.status == 500);
  return this.__(error[elem]);
});

hbs.registerHelper('tagLink', function(tag) {
  return `<a href="/?q=${tag}">${tag}</a>`;
});

hbs.registerHelper('tagUrl', function(tag) {
  tag = tag.replace('#', '%23');
  return '/search/' + tag;
});

hbs.registerHelper('profileUrl', function(user, organisation) {
  if (!organisation || !user || !organisation._id) return null;
  recordTag = user.getRecordTagByOrgId(organisation._id);
  if (!recordTag) return null;
  return new UrlHelper(organisation.tag, `${recordTag}`, null, this.getLocale()).getUrl();
});

hbs.registerHelper('myEditUrl', function(organisation) {
  if (!organisation || !organisation.tag) return null;
  return new UrlHelper(organisation.tag, 'onboard/intro', null, this.getLocale()).getUrl();
});

hbs.registerHelper('profileLink', function(user, organisation) {
  if (!organisation || !user || !organisation._id) return null;
  recordId = user.getRecordIdByOrgId(organisation._id);
  if (!recordId) return null;
  url = new UrlHelper(organisation.tag, `id/${recordId}`, null, this.getLocale()).getUrl();
  //What about using the refresh icon instrad of the arrow-up?
  return `<a title="${this.__('Profile')}" class="pure-menu-link profile-link" href="${url}">${this.__('Profile')}</a>`;
});

hbs.registerHelper('adminUrl', function(organisation) {
  return new UrlHelper(organisation.tag, `admin/`, null, this.getLocale()).getUrl();
});

hbs.registerHelper('adminLink', function(user, organisation) {
  if (!organisation || !user || !organisation._id || !user.isAdminToOrganisation(organisation._id)) return null;
  url = new UrlHelper(organisation.tag, `admin/`, null, this.getLocale()).getUrl();
  return `<a title="${this.__('Administration')}" class="pure-menu-link admin-link" href="${url}">${this.__('Administration')}</a>`;
});

hbs.registerHelper('addLink', function(user, organisation) {
  if (!organisation || !user || !organisation._id || !user.belongsToOrganisation(organisation._id)) return null;
  url = new UrlHelper(organisation.tag, `edit/add/`, null, this.getLocale()).getUrl();
  return `<a id="addLink" title="${this.__('Add new record')}" class="fa fa-plus-circle" href="${url}" aria-hidden="true"></a>`;
});

hbs.registerHelper('url', function(path, organisationTag, query) {
  return new UrlHelper(organisationTag, path, null, this.getLocale()).getUrl();
});

hbs.registerHelper('editUrl', function(recordId, organisationTag, step) {
  if (!['intro','hashtags','links'].includes(step)) step = 'intro';
  page = 'onboard/'+step;
  query = '?recordId='+recordId;
  return new UrlHelper(organisationTag, page, query, this.getLocale()).getUrl();
});

hbs.registerHelper('deleteUrl', function(recordId, organisationTag) {
  page = 'admin/record/delete/'+recordId;
  return new UrlHelper(organisationTag, page, null, this.getLocale()).getUrl();
});

hbs.registerHelper('homeUrl', function(organisation, locale) {
  locale = typeof locale === 'string' ? locale : this.getLocale();
  if (organisation && organisation.tag) return new UrlHelper(organisation.tag, 'search', null, locale).getUrl();
  else return new UrlHelper(null, null, null, this.getLocale()).getUrl();
});

hbs.registerHelper('nl2br', function(string) {
  if (string)
    return string.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2');
});

const tagRegex = /([@#][^\s@#\,\.\!\?\;\(\)]+)/g;

hbs.registerHelper('cleanShortDesc', function(description) {
  return description.substring(0, 160).replace(tagRegex, `<span style="color:#7F8C8D;">$&</span>`).replace(/(?:\r\n|\r|\n)/g, '<br />') + '...';
});

hbs.registerHelper('ifEqual', function(v1, v2, options) {
  if(v1 === v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

hbs.registerPartials(__dirname + '/partials');
hbs.registerPartials(__dirname + '/home/partials');

module.exports = hbs;
