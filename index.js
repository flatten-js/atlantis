require('dotenv').config()

const { program } = require('commander')

const Atlantis = require('./lib/atlantis.js')
const { sleep } = require('./lib/utils.js')

const atlantis = new Atlantis(process.env.RSA_PUBLIC_KEY)

program
  .command('create')
  .argument('<src>')
  .action(src => atlantis.compress(src))

program
  .argument('<src>')
  .argument('<key>')
  .action((src, key) => atlantis.uncompress(src, key))

program.parse()
