// The length of the Description Snippet depends on the screen width.
// @todo make it responsive dynamically (or not?)
var introSnippetLength = 7;
var extraLinkLimit = 3;
if (window.matchMedia('(min-width: 720px)').matches) {
		introSnippetLength = 15;
		extraLinkLimit = 4;
}

function getPictureUrl(item) {
	if (item.picture && item.picture.url) {
			return item.picture.url;
	} else if (item.picture && item.picture.path) {
		return "/images" + item.picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else {
		switch (item.type) {
			case 'team' : return "/images/placeholder_team.png";
			case 'hashtag' : return "/images/placeholder_hashtag.png";
			default: case 'person': return "/images/placeholder_person.png";
		}
	}
}

function getHashtagPictureHtml(item) {
	if (item.picture && item.picture.path) {
		return '<img src="' + getPictureUrl(item) + '">';
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
  query = query || '';
  locale = locale || getLocale();
  if (isProduction) {
    url =  'https://' + ( subdomains ? subdomains + '.' : '' ) + 'wingzy.io/' + ( locale ? locale + '/' : '') + path + query;
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
  if (['en','fr'].includes(firstPath)) locale = firstPath;

  return locale;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function goRight(child) {
  child.parentElement.getElementsByClassName('scroll')[0].scrollLeft += 200;
}

function goLeft(child) {
  child.parentElement.getElementsByClassName('scroll')[0].scrollLeft -= 200;
}



transformItem = function (item, facets) {
	transformImagePath(item);
	transformHashtags(item, facets);
	transformIntro(item);
	transformLinks(item);
	addUrl(item);
	addTag(item);
	return item;
};

function addTag(item) {
	item.showTag = getParameterByName('hashtags');
}

function addPictureHtml(item) {
	item.pictureHtml = getHashtagPictureHtml(item);
}

function transformImagePath(item) {
	if (item.picture && item.picture.url) {
			item.picture.url = item.picture.url;
	} else if (item.picture && item.picture.path) {
		item.picture.url = "/images" + item.picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (item.picture && item.picture.uri) {
		item.picture.url = item.picture.uri;
	} else {
		switch (item.type) {
			case 'team' : item.picture = { url: "/images/placeholder_team.png"}; break;
			case 'hashtag' : item.picture = { url: "/images/placeholder_hashtag.png"}; break;
			default: case 'person' : item.picture = { url: "/images/placeholder_person.png"}; break;
		}
	}
}

function transformIntro(item) {
	if (item._snippetResult && item._snippetResult.intro && item._snippetResult.intro.value) item._snippetResult.intro.value = transformString(item._snippetResult.intro.value, item.hashtags);
	else if (item._snippetResult && item._snippetResult.description && item._snippetResult.description.value ) item._snippetResult.intro = {value: transformString(item._snippetResult.description.value, item.hashtags)};
}

function transformString(input, hashtags) {
		// Does not match person (@) yet
		var regex = /([#][^\s@#\,\.\!\?\;\(\)]+)/g;
		input = input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			record = getRecord(cleanMatch, hashtags);
			return '<a title="' + record.name + '" class="link-' + record.type + '" onclick="setSearch(\'' + ( record.type == 'team' ? '' : cleanMatch ) + '\', \'' + ( record.type == 'team' ? cleanMatch : '' ) + '\')">' + match + '</a>';
		});
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
		case 'email':
			link.icon = 'envelope-o';
			break;
		case 'address':
			link.icon = 'map-marker';
			break;
		case 'hyperlink':
			link.icon = 'link';
			break;
		default:
			link.icon = link.type;
			break;
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

function addUrl(item) {
	var path = 'id/' + item.objectID;
	item.url = makeUrl(null, path);
}

transformHashtags = function(item, facets) {
	if (!item.hashtags) item.hashtags = [];
	makeHightlighted(item, facets);
	orderHashtags(item);
	item.hashtags.forEach(function(item) {
		addPictureHtml(item);
	});
};

makeHightlighted = function(item, facets) {
	if (!facets) {
		if (!item._highlightResult.hashtags) item._highlightResult.hashtags = [];
		item._highlightResult.hashtags.forEach(function(hashtag, index) {
			if (hashtag.tag && hashtag.tag.fullyHighlighted) item.hashtags[index].class = 'highlighted';
		});
	} else {
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
