const { program } = require('commander')

const package = require('./package.json')
const Atlantis = require('./lib/atlantis.js')
const { ALGORITHM } = require('./lib/crypt.js')


const atlantis = new Atlantis()

program
  .name('atlantis')
  .description('Encrypted folders that appear only at runtime')
  .version(package.version)

program
  .command('create')
  .description('Create encrypted folder')
  .argument('<src>', 'Path to the folder you want to encrypt')
  .option('-alg, --algorithm <algorithm>', 'Algorithm to encrypt', ALGORITHM.AES)
  .action(async src => {
    const { algorithm } = program.opts()
    const key = await Atlantis.key(algorithm, true)
    atlantis.compress(src, algorithm, key)
  })

program
  .description('Expand encrypted folder')
  .argument('<src>', 'Path to encrypted folder')
  .option('-alg, --algorithm <algorithm>', 'Algorithm to decrypt', ALGORITHM.AES)
  .action(async src => {
    const { algorithm } = program.opts()
    const key = await Atlantis.key(algorithm)
    atlantis.uncompress(src, algorithm, key)
  })

program.parse(process.argv)
