const read = require('read')


exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
exports.prompt = prompt => new Promise(resolve => read({ prompt, silent: true }, (_, input) => resolve(input)))
exports._enum = l => l.reduce((acc, cur) => ({ ...acc, [cur]: cur }), {})
