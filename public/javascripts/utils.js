/**
* @Author: Clément Dietschy <bedhed>
* @Date:   21-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 26-06-2017 12:52
* @Copyright: Clément Dietschy 2017
*/

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

function togglePanel() {
	document.getElementById('left-panel').classList.toggle('open');
  document.getElementById('toggle-panel').classList.toggle('open');
}

function openPanel() {
	document.getElementById('left-panel').classList.add('open');
  document.getElementById('toggle-panel').classList.add('open');
}

function onloadActions() {
  if (window.matchMedia('(min-width: 1280px)').matches) {
  	openPanel();
  }
}

function resizeImg(img, ratio) {
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  ratio = ratio || 1;
  if (width/height > ratio) {
    img.classList.add('horizontal');
    let marginLeft = Math.round((img.height*ratio-img.width)/2);
    img.style.marginLeft = marginLeft+"px";
  } else {
    marginTop = Math.round((img.width/ratio-img.height)/2);
    img.style.marginTop = marginTop+"px";
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
function addLinkInput(button) {
	var fieldset = findAncestor(button, 'pure-group');
  var span = findAncestor(button, 'links-li');
  var input = document.createElement('input');
  input.name = `newLinks[${inputIndex}][value]`;
  inputIndex++;
  input.className = "pure-input-1 link-input";
  input.type = "text";
  input.placeholder = "Address, url, email, phone...";
  fieldset.insertBefore(input, span);
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
      if (query) query += `&subdomains=${subdomains}`;
      else query = `?subdomains=${subdomains}`;
    }
    url = `http://localhost:3000/${locale ? locale + '/' : ''}${path}${query}`;
  } else {
    url =  `https://${subdomains ? subdomains + '.' : ''}lenom.io/${locale ? locale + '/' : ''}${path}${query}`;
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

window.onload = onloadActions;
