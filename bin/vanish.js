require('dotenv').config()

const Atlantis = require('../lib/atlantis.js')

const atlantis = new Atlantis(process.env.RSA_PUBLIC_KEY)
atlantis.vanish(process.argv[2])
