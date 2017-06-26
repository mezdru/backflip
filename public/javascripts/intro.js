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
      intro: "<h2><strong>Hello You</strong></h2><p>Lenom is an app to find the <strong><i class='fa fa-user-circle-o' aria-hidden='true'></i>Persons</strong> we are working with.</p><p class='align-right'>(basically, it's a directory)</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: introWide ? introRecord1.querySelector('.description.full') : introRecord0.querySelector('.description.snippet') ,
      intro: "<h2>Discover</h2><p>We each have our own story:</p><p>Team, position, skills, interests, hobbies, dreams...</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: introWide ? introRecord1.querySelector('.links') : introRecord0.querySelector('.links'),
      intro: "<h2>Reach</h2><p>We also have our many ways to contact each other.</p><p class='align-right'>(maybe too many?)</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned'
    },
    {
      element: document.querySelector('#search'),
      intro: "<h2>Find</h2><p>Lenom searches through all this within milliseconds.</p><p>Try <a onclick=\"setSearch('HR intern in korea')\">HR intern in Paris</a>.</p>",
      position: 'bottom-middle-aligned'
    },
    {
      element: introWide ? document.querySelector('#left-panel') : document.querySelector('#subheader'),
      intro: "<h2>Navigate</h2><p>Plus Lenom provides <strong><i class='fa fa-at' aria-hidden='true'></i>Teams</strong> and<br><abbr title='One Hashtag can be a skill, project, achievement...'><strong><i class='fa fa-hashtag' aria-hidden='true'></i>Hashtags</strong></abbr> exploration.</p>",
      position: introWide ? 'right' : 'bottom-middle-aligned',
      introWideOnly: true
    },
    {
      intro: "<h2><strong>Be lazy</strong></h2><p>Find each other effortlessly:</p><p>Lenom builds itself and keeps updated <abbr title='Lenom learns by integrating with your existing tools'>automagically</abbr>.</p><div style='width:100%;height:0;padding-bottom:58%;padding-top:8px;position:relative;'><iframe src='https://giphy.com/embed/26ufnwz3wDUli7GU0' width='100%' height='100%' style='position:absolute' frameBorder='0' class='giphy-embed' allowFullScreen></iframe></div>"
    }
  ];
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
