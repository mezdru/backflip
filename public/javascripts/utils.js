/**
* @Author: Clément Dietschy <bedhed>
* @Date:   21-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 06-04-2017 01:48
* @Copyright: Clément Dietschy 2017
*/

function findAncestor(child, classSearched) {
    while ((child = child.parentElement) && !child.classList.contains(classSearched));
		return child;
}

function toggleRecord(child) {
  findAncestor(child, 'record').classList.toggle('regular');
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
}

function resizeImg(img) {
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (height/width < 1) {
    img.classList.add('horizontal');
    let marginLeft = Math.round((img.height-img.width)/2);
    img.style.marginLeft = marginLeft+"px";
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
