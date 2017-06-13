/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-06-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 13-06-2017 12:00
* @Copyright: Clément Dietschy 2017
*/

var introRecord1;
var introRecord2;
var introPanel = false;

function setIntro() {
  if (window.matchMedia('(min-width: 1280px)').matches) {
  	openPanel();
    introPanel = true;
  }
  introRecord1 = document.querySelectorAll('#search-results .person')[1];
  introRecord2 = document.querySelectorAll('#search-results .person')[2];
  introRecord2.classList.add('expanded');
}

function getIntroSteps() {
  steps = [
    {
      intro: "<h2>Welcome</h2>Take a tour of Lenom awesome features."
    },
    {
      element: introRecord1,
      intro: "<h2>Human centric</h2>This is one of your coworker. A human, with a face, a name, skills and interests.",
      position: 'right'
    },
    {
      element: introRecord2.querySelector('.description'),
      intro: "<h2>Story first</h2>Everyone got their own story. My job, my title, my team, AND my skills, interests, envy.",
      position: 'right'
    },
    {
      element: introRecord2.querySelector('.links'),
      intro: "<h2>Links</h2>There are already many tools & ways to reach someone, connect with a click on Lenom.",
      position: 'right'
    },
    {
      element: document.querySelector('#search'),
      intro: "<h2>Find</h2>Use the lightning fast & clever search field to find people by name, skill and/or interest. Try NodeJS expert london",
      position: 'right'
    },
    {
      element: document.querySelector('#left-panel'),
      intro: "<h2>Navigate</h2>Explore your organisation with the tree breakdown.",
      position: 'bottom-middle-aligned',
      introPanel: true
    },
    {
      intro: "<h2>Effortless</h2>Lenom requires no work to deploy, it pulls data from where it already exist. <a href='https://lenom.io'>Click here to start</a>."
    }
  ];
  if (!introPanel) steps = steps.filter(step => !introPanel);
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
