/**
* @Author: Clément Dietschy <bedhed>
* @Date:   21-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 12-06-2017 10:50
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

function onloadToggle() {
  if (window.matchMedia('(min-width: 1280px)').matches) {
  		togglePanel();
  }
  startIntro();
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

window.onload = onloadToggle;
