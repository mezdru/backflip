/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-06-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 26-06-2017 12:57
* @Copyright: Clément Dietschy 2017
*/

var introRecord0;
var introRecord1;
var introWide = false;

function setIntro() {
  //search.helper.clearRefinements().toggleRefinement('structure.0','@HQ > @Services > @HR').setQuery('HR Intern').search();
  // At the moment we don't want the left panel
  if (window.matchMedia('(min-width: 1280px)').matches) {
  	//openPanel();
    introWide = true;
  }
  introRecord0 = document.querySelectorAll('#search-results .record.person')[0];
  introRecord1 = document.querySelectorAll('#search-results .record.person')[1];
  introRecord1.classList.add('expanded');
}

function startIntro(){
  setIntro();
  var intro = introJs();
  intro.setOptions({
      steps: introSteps(),
      hidePrev: true,
      hideNext: true,
      showStepNumbers: false
    });
  intro.start();
}
