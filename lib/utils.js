exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
exports._enum = l => l.reduce((acc, cur) => ({ ...acc, [cur]: cur }), {})
