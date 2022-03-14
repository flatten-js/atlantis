const Atlantis = require('../lib/atlantis.js')

const atlantis = new Atlantis()
atlantis.vanish(...process.argv.slice(2))
