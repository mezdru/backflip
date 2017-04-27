/**
* @Author: Clément Dietschy <bedhed>
* @Date:   27-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 27-04-2017 11:19
* @Copyright: Clément Dietschy 2017
*/



var HierarchyHelper = class HierarchyHelper {

  constructor(within, tree) {
    this.within = within;
    this.tree = tree;
    this.hierarchy = {};
  }

  build() {
    this.within.forEach(this.recordToHierarchy, this);
  }

  recordToHierarchy(record) {
    let branches = this.tree.filter (function (branch) {
      return branch[branch.length-1] == record.tag;
    });
    branches.forEach(this.branchToHierarchy, this);
  }

  branchToHierarchy(branch) {
    branch.forEach(function(node, index, branch) {
      this.branchToLevel(branch.slice(0, index+1));
    }, this);
  }

  branchToLevel(branch) {
    let level = branch.length-1;
    let branchAsString = HierarchyHelper.branchAsString(branch);
    if (!this.hierarchy[level]) this.hierarchy[level] = [];
    if (!this.branchExists(branchAsString, level)) this.hierarchy[level].push(branchAsString);
  }

  branchExists(branchAsString, level) {
    return this.hierarchy[level].some(string => string == branchAsString);
  }

  static branchAsString(branch) {
    return branch.reduce((acc, cur) => acc + ' > ' + cur);
  }

};

module.exports = HierarchyHelper;
