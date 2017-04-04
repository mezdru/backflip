/**
* @Author: Clément Dietschy <clement>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 04-04-2017 12:25
* @Copyright: Clément Dietschy 2017
*/

/*
/ lenom MVP JS
/ Copyright Clément Dietschy 2016
*/

function transformDescription(item) {

	// Building an equivalence table
	// substr = @tag to replace
	// replaceBy = the html to replace with
	item.equivalence = [];
	for (let key in item.within) {
		item.equivalence.push({'substr': '@'+item.within[key].short_name, 'replaceBy': makeReplacement(key, item)});
	}

	description = item._highlightResult.description.value;

	//Cleaning the highlights <em> <\em>
	description = description.replace(new RegExp(/@[\w<>\/]*/gi), replacer);

	// Going through the equivalence table and replacing all occurences in the Highlighted description
	for (let key in item.equivalence) {
		description = description.replace(item.equivalence[key].substr, item.equivalence[key].replaceBy);
	}

	item._highlightResult.description.value = description;
}

function makeReplacement(key, item) {
		let cssClass = "team";
		if (item._highlightResult.within[key].short_name.fullyHighlighted === true) {
			cssClass += " highlight";
		}
		return `<a href="directory?q=@${item.within[key].short_name}" class="${cssClass}">${item._highlightResult.within[key].name.value}</a>`;
}

function replacer(match) {
	return match.replace(new RegExp(/<\/?em>/gi), '');
}
