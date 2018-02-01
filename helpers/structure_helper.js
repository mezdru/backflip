var StructureHelper = class StructureHelper {

  constructor(within, tree) {
    this.within = within;
    this.tree = tree;
    this.ranking = 0;
    this.structure = {};
  }

  build() {
    this.within.forEach(this.recordToStructure, this);
  }

  recordToStructure(record) {
    let branches = this.tree.filter (function (branch) {
      return branch[branch.length-1] == record.tag;
    });
    branches.forEach(this.branchToStructure, this);
  }

  branchToStructure(branch) {
    branch.forEach(function(node, index, branch) {
      this.branchToLevel(branch.slice(0, index+1));
    }, this);
  }

  branchToLevel(branch) {
    let level = branch.length-1;
    let branchAsString = StructureHelper.branchAsString(branch);
    if (!this.structure[level]) this.structure[level] = [];
    if (!this.branchExists(branchAsString, level)) this.structure[level].push(branchAsString);
  }

  branchExists(branchAsString, level) {
    return this.structure[level].some(string => string == branchAsString);
  }

  static branchAsString(branch) {
    return branch.reduce((acc, cur) => acc + ' > ' + cur);
  }

};

module.exports = StructureHelper;
