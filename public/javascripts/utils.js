// The length of the Description Snippet depends on the screen width.
// @todo make it responsive dynamically (or not?)
var introSnippetLength = 7;
var extraLinkLimit = 3;
if (window.matchMedia('(min-width: 720px)').matches) {
		introSnippetLength = 15;
		extraLinkLimit = 3;
}

function getPictureUrl(item, iconOnly) {
	if (item.picture && item.picture.path) {
		return "/images" + item.picture.path;
	} else if (item.picture && item.picture.url && !iconOnly) {
			return item.picture.url;
	} else if (item.type === 'person') {
		return "/images/placeholder_person.png";
	} else {
		return "";
	}
}

function getPictureHtml(item, iconOnly) {
	if (item.picture && item.picture.emoji) {
		return twemoji.parse(item.picture.emoji, {ext: '.svg', folder: 'svg',});
	}
	var url = getPictureUrl(item, iconOnly);
	if (url) {
		return '<img src="' + url + '">';
	} else {
		return '';
	}
}


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getTemplate(templateName) {
  return document.getElementById(templateName + '-template').innerHTML;
}

function makeUrl(subdomains, path, query, locale) {
  var url;
  subdomains = subdomains || getSubdomain();
  path = path || '';
 	path = path.replace('#', '%23');
  query = query || '';
  locale = locale || getLocale();
  if (isProduction) {
    url =  'https://' + ( subdomains ? subdomains + '.' : '' ) + 'wingzy.com/' + ( locale ? locale + '/' : '') + path + query;
  } else {
		if (subdomains) {
	    if (query) query += '&subdomains='+subdomains;
	    else query = '?subdomains='+subdomains;
	  }
		var protocol = location.protocol ;
		var host = window.location.hostname;
	  url = location.protocol + '//' + host + (location.port ? ':' + location.port : '') + '/' + (locale ? locale + '/' : '') + path + query;
  }
  return url;
}

var subdomain;
function getSubdomain() {
  if (subdomain) return subdomain;

  var elements = window.location.host.split('.');
  if (isProduction && elements.length > 2) subdomain = elements[0];
  else subdomain = getParameterByName('subdomains');

  return subdomain;
}

var locale;
function getLocale() {
  if (locale) return locale;

  firstPath = window.location.pathname.split('/')[1];
  if (['en','fr','en-UK'].includes(firstPath)) locale = firstPath;

  return locale;
}

function getRandomInt(max) {
  return Math.round(Math.random() * Math.floor(max));
}


// HORIZONTAL SCROLLERS
function goRight(event) {
	var interval = window.setInterval(function() {event.target.parentElement.getElementsByClassName('scroll')[0].scrollLeft += 2;}, 5);
	event.target.addEventListener('mouseup', function() {clearInterval(interval);});
}

function goLeft(event) {
	var interval = window.setInterval(function() {event.target.parentElement.getElementsByClassName('scroll')[0].scrollLeft -= 2;}, 5);
	event.target.addEventListener('mouseup', function() {clearInterval(interval);});
}

transformItem = function (item, facets) {
	translateName(item);
	addUrl(item);
	addPictureHtml(item);
	transformHashtags(item, facets);
	transformIntro(item);
	transformLinks(item);
	item[item.type] = true;
	if (qrcode) {
		item.qrcode = true;
		addQRCodeHtml(item);
	}
	return item;
};

function addPictureHtml(item, iconOnly) {
	item.pictureHtml = getPictureHtml(item, iconOnly);
}

function addQRCodeHtml(item) {
	var src = "https://api.qrserver.com/v1/create-qr-code/" +
	"?size=500x500" +
  "&color=346EA3" +
	"&bgcolor=fcfcfc" +
	"&margin=10" +
	"&data=" +
	"https://app.wingzy.com/en/" + getOrgTag(item) + "/" + item.tag.substr(1) + "/add/HoNw4OjKW9ShWgKj";
	item.qrcodeHtml = '<div class="right-logos">' +
		'<p><img class="meridiam-logo" src="/meridiam_retreat.png"></p>' +
		'<p><img class="qrcode" src="'+src+'"></p>' +
		'<p>BY <img class="wingzy-logo" src="/wingzy_line.png"></p>' +
		'</div>';
}

function transformIntro(item) {
	if (item._snippetResult && item._snippetResult.intro && item._snippetResult.intro.value) item._snippetResult.intro.value = transformString(item._snippetResult.intro.value, item);
	else if (item._snippetResult && item._snippetResult.description && item._snippetResult.description.value ) item._snippetResult.intro = {value: transformString(item._snippetResult.description.value, item)};
}

function transformString(input, item) {
		// Does not match person (@) yet
		var regex = /([#][^\s@#\,\.\!\?\;\(\)]+)/g;
		input = input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			record = getRecord(cleanMatch, item.hashtags);
			return '<a ' +
				'title="' + record.name + '" ' +
				'class="' + record.type + '" ' +
				'data-tag="' + record.tag + '" ' +
				'data-name="' + record.name + '" ' +
				'>' +
				match +
				'</a>';
		});
		input = input.replace('…', '<a href="'+item.url+'">…</a>');
		return input;
}

function getRecord(tag, hashtags) {
	record = hashtags.find(function (record) { return record.tag == tag; });
	if (!record) return {tag: tag, name: tag, type: 'hashtag'};
	return record;
}

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
function transformLinks(item) {
	item.links = item.links || [];
	item.links.forEach(function (link, index, array) {
		makeLinkDisplay(link);
		makeLinkIcon(link);
		makeLinkUrl(link);
		if (index > extraLinkLimit-1) link.class = 'extraLink';
	});
}

function makeLinkIcon(link) {
	switch (link.type) {
		case 'email': link.icon = 'envelope-o'; break;
		case 'address': case 'location': link.icon = 'map-marker'; break;
		case 'hyperlink': link.icon = 'link'; break;
		case 'location': link.icon = 'map-marker'; break;
		case 'workplace': link.icon = 'user'; break;
		case 'workchat': link.icon = 'comment'; break;
		default: link.icon = link.type;	break;
	}
}

function makeLinkDisplay(link) {
	link.display = link.display || link.value;
}

function makeLinkUrl(link) {
	link.url = link.url || link.uri;
	if (!link.url) {
		switch (link.type) {
			case 'email':
				link.url = 'mailto:'+link.value;
				break;
			case 'phone':
				link.url = 'tel:'+link.value;
				break;
			case 'home':
				link.url = 'tel:'+link.value;
				break;
			case 'address':
				link.url = 'http://maps.google.com/?q='+encodeURIComponent(link.value);
				break;
			default:
				link.url = link.value;
				break;
		}
	}
}

function getOrgTag(item) {
	if (orgsIdsToTags && item.organisation) {
		return orgsIdsToTags[item.organisation];
	} else return null;
}

function getOrgId(orgTag) {
	if (!orgTag) orgTag	= getSubdomain();
	if (orgsTagsToIds) {
		return orgsTagsToIds[orgTag];
	} else return null;
}

function addUrl(item) {
	item.url = makeUrl(getOrgTag(item), 'oldprofile/'+item.tag);
}

transformHashtags = function(item, facets) {
	if (!item.hashtags) item.hashtags = [];
	makeHightlighted(item, facets);
	orderHashtags(item);
	item.hashtags.forEach(function(item) {
		translateName(item);
		addPictureHtml(item, true);
	});
};

function translateName(item) {
	if (item.name_translated && item.name_translated[locale]) {
		item.name = item.name_translated[locale];
	}
	if (item._highlightResult && item._highlightResult.name_translated && item._highlightResult.name_translated[locale]) {
		item._highlightResult.name =item._highlightResult.name_translated[locale];
	}
}

makeHightlighted = function(item, facets) {
	if (!item._highlightResult.hashtags) item._highlightResult.hashtags = [];
	item._highlightResult.hashtags.forEach(function(hashtag, index) {
		if (hashtag.tag && hashtag.tag.fullyHighlighted) item.hashtags[index].class = 'highlighted';
	});
	if (facets) {
		item.hashtags.forEach(function(hashtag, index) {
			if (hashtag.tag && facets.includes(hashtag.tag)) item.hashtags[index].class = 'highlighted';
		});
	}
};

orderHashtags = function(item) {
	var highlighted = [];
	var notHighlighted = [];
	item.hashtags.forEach(function(hashtag) {
		if (hashtag.class === 'highlighted') highlighted.push(hashtag);
		else notHighlighted.push(hashtag);
	});
	item.hashtags = highlighted.concat(notHighlighted);
};


function onload() {
}

window.onload = onload();
