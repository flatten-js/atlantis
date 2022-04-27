const { Atlantis } = require('../dist/lib/atlantis.js')
const atlantis = new Atlantis()
atlantis.vanish(...process.argv.slice(2))
