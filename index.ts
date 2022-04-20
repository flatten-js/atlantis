import { program } from 'commander'

import { atlantis } from './lib/atlantis'
import { ALGORITHM } from './lib/crypt'
import { prompt } from './lib/prompt'

import _package from './package.json'


program
  .name('atlantis')
  .description('Encrypted folders that appear only at runtime')
  .version(_package.version)

program
  .command('create')
  .description('Create encrypted folder')
  .option('-alg, --algorithm <algorithm>', 'Algorithm to encrypt', ALGORITHM.AES)
  .action(async () => {
    const { algorithm } = program.opts()
    const src = await prompt.secret('Please enter your folder to encrypt: ')
    const key = await atlantis.key(algorithm, true)
    atlantis.compress(src, algorithm, key)
  })

program
  .description('Expand encrypted folder')
  .option('-alg, --algorithm <algorithm>', 'Algorithm to decrypt', ALGORITHM.AES)
  .action(async () => {
    const { algorithm } = program.opts()
    const src = await prompt.secret('Please enter your folder to decrypt: ')
    const key = await atlantis.key(algorithm)
    atlantis.uncompress(src, algorithm, key)
  })

program.parse(process.argv)
