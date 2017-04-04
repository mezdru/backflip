/**
* @Author: Clément Dietschy <clement>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 04-04-2017 04:34
* @Copyright: Clément Dietschy 2017
*/

/*
/ lenom MVP JS
/ Copyright Clément Dietschy 2016
*/

function transformDescriptions(item) {
	item._snippetResult.description.value = transformString(item._snippetResult.description.value);
	item._highlightResult.description.value = transformString(item._highlightResult.description.value);
}

function transformString(input) {
		var regex = /([@#][\w-<>\/]+)/g;
		return input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			return `<a href="/?q=${cleanMatch}">${match}</a>`;
		});
}
