/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-06-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 14-06-2017 12:44
* @Copyright: Clément Dietschy 2017
*/

var introRecord0;
var introRecord1;
var introWide = false;

function setIntro() {
  //search.helper.clearRefinements().toggleRefinement('structure.0','@HQ > @Services > @HR').setQuery('HR Intern').search();
  if (window.matchMedia('(min-width: 1280px)').matches) {
  	openPanel();
    introWide = true;
  }
  introRecord0 = document.querySelectorAll('#search-results .record.person')[0];
  introRecord1 = document.querySelectorAll('#search-results .record.person')[1];
  introRecord1.classList.add('expanded');
}

function getIntroSteps() {
  steps = [
    {
      element: introRecord0,
      intro: "<h2>Simply humans</h2><p>Lenom is an app to find & reach the people we are working with.</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: introWide ? introRecord1.querySelector('.description.full') : introRecord0.querySelector('.description.snippet') ,
      intro: "<h2>Stories</h2><p>We each have our own story: job, skills, interests...</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: introWide ? introRecord1.querySelector('.links') : introRecord0.querySelector('.links'),
      intro: "<h2>Links</h2><p>We also have a few ways to reach each other.</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: document.querySelector('#search'),
      intro: "<h2>Search</h2><p>Lenom looks through all this within milliseconds.</p><p>Try <a onclick=\"setSearch('hr intern korea')\">hr interm korrea</a> (typo included)</p>",
      position: 'bottom-middle-aligned'
    },
    {
      element: document.querySelector('#left-panel'),
      intro: "<h2>Navigate</h2><p>And Lenom provides teams & hashtags exploration.</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned',
      introWideOnly: true
    },
    {
      intro: "<h2><strong>Be lazy</strong></h2><p>Lenom builds itself and keeps updated <abbr title='Lenom learns through integration with your existing tools'>automagically</abbr>.</p><p><a href='https://lenom.io'><i class='fa fa-play-circle' aria-hidden='true'></i> Join the private beta</a></p>"
    }
  ];
  if (!introWide) steps = steps.filter(step => !step.introWideOnly);
  return steps;
}

function startIntro(){
  setIntro();
  var intro = introJs();
  intro.setOptions({
      steps: getIntroSteps(),
      hidePrev: true,
      hideNext: true,
      showStepNumbers: false
    });
  intro.start();
}
