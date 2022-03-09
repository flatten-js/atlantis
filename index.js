require('dotenv').config()

const { program } = require('commander')

const package = require('./package.json')
const Atlantis = require('./lib/atlantis.js')
const { sleep } = require('./lib/utils.js')

const atlantis = new Atlantis(process.env.RSA_PUBLIC_KEY)

program
  .name('atlantis')
  .description('Encrypted folders that appear only at runtime')
  .version(package.version)

program
  .command('create')
  .description('Create encrypted folder')
  .argument('<src>', 'Path to the folder you want to encrypt')
  .action(src => atlantis.compress(src))

program
  .description('Expand encrypted folder')
  .argument('<src>', 'Path to encrypted folder')
  .argument('<key>', 'Path to private key')
  .action((src, key) => atlantis.uncompress(src, key))

program.parse()
