exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
exports._enum = l => l.reduce((acc, cur) => ({ ...acc, [cur]: cur }), {})
exports.done = async (retry, cb) => {
  while (retry--) {
    if (await cb()) return true
    await exports.sleep(1000)
  }
  return false
}
