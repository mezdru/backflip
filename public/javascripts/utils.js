function findAncestor(child, classSearched) {
    while ((child = child.parentElement) && !child.classList.contains(classSearched));
		return child;
}

function toggleRecord(child) {
	findAncestor(child, 'record').classList.toggle('expanded');
}

function toggleLink(child) {
	var linkLi = findAncestor(child, 'linkLi');
	linkLi.classList.toggle('deleted');
	var linkDeleted = linkLi.getElementsByClassName('deleted-input')[0];
	linkDeleted.value = linkDeleted.value == 'true' ? 'false' : 'true';
}

function resizeImg(img, ratio) {
  var width = img.naturalWidth;
  var height = img.naturalHeight;
  ratio = ratio || 1;
  if (width/height > ratio) {
    img.classList.add('horizontal');
    var marginLeft = Math.round((img.height*ratio-img.width)/2);
    img.style.marginLeft = marginLeft+"px";
  } else {
    marginTop = Math.round((img.width/ratio-img.height)/2);
    img.style.marginTop = marginTop+"px";
  }
}

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

var inputIndex = 0;
function addLinkInput(placeholder, value) {
	var fieldset = document.getElementById('new-links-fieldset');
  var input = document.createElement('input');
  input.name = 'newLinks['+inputIndex+'][value]';
  inputIndex++;
  input.className = "pure-input-1 link-input";
  input.type = "text";
  input.placeholder = placeholder;
  input.value = value || '';
  fieldset.insertBefore(input, null);
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
  if (isDevelopment) {
    if (subdomains) {
      if (query) query += '&subdomains='+subdomains;
      else query = '?subdomains='+subdomains;
    }
    url = 'http://localhost:3000/' + (locale ? locale + '/' : '') + path + query;
  } else {
    url =  'https://' + ( subdomains ? subdomains + '.' : '' ) + 'wingzy.io/' + ( locale ? locale + '/' : '') + path + query;
  }
  return url;
}

var subdomain;
function getSubdomain() {
  if (subdomain) return subdomain;

  var elements = window.location.host.split('.');
  if (elements.length > 2) subdomain = window.location.host.split('.')[0];
  else if (isDevelopment) subdomain = getParameterByName('subdomains');

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


function onloadActions() {
  /*if (window.matchMedia('(min-width: 1280px)').matches) {
  	openPanel();
  }*/
}

window.onload = onloadActions;
