exports.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
exports._enum = l => l.reduce((acc, cur) => ({ ...acc, [cur]: cur }), {})
exports.run = (cb, ms, validator) => {
  return new Promise(resolve => {
    setTimeout(async function run() {
      try {
        const data = await cb()
        if (validator && !validator(data)) throw {}
        return resolve(data)
      } catch {
        setTimeout(run, ms)
      }
    }, 0)
  })
}
