module.exports = {
  ScriptTarget: { Latest: 'latest' },
  createSourceFile: (fileName, content, _target, _setParentNodes) => ({ fileName, content }),
};
