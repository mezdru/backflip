function getPictureUrl(item) {
	if (item.picture && item.picture.url) {
			return item.picture.url;
	} else if (item.picture && item.picture.path) {
		return "/images" + item.picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (item.picture && item.picture.uri) {
		return item.picture.uri;
	} else {
		switch (item.type) {
			case 'team' : return "/images/placeholder_team.png";
			case 'hashtag' : return "/images/placeholder_hashtag.png";
			default: case 'person': return "/images/placeholder_person.png";
		}
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


function onload() {
}

window.onload = onload();
