import { program, Option } from 'commander'

import { atlantis } from './lib/atlantis'
import { ALGORITHM } from './lib/crypt'
import { prompt } from './lib/prompt'

import pkg from './package.json'


program
  .name('atlantis')
  .description('Encrypted folders that appear only at runtime')
  .version(pkg.version)

const algorithm_option = (name: string): Option => {
  const args: [string, string] = ['-alg, --algorithm <algorithm>', `Algorithm to ${name}`]
  return new Option(...args).choices(Object.keys(ALGORITHM)).default(ALGORITHM.AES)
}

program
  .command('create')
  .description('Create encrypted folder')
  .addOption(algorithm_option('encrypt'))
  .action(async () => {
    const { algorithm }: { algorithm: ALGORITHM } = program.opts()
    const src = await prompt.secret('Please enter your folder to encrypt: ')
    const key = await atlantis.key(algorithm, true)
    atlantis.compress(src, algorithm, key)
  })

program
  .description('Expand encrypted folder')
  .addOption(algorithm_option('decrypt'))
  .action(async () => {
    const { algorithm }: { algorithm: ALGORITHM } = program.opts()
    const src = await prompt.secret('Please enter your folder to decrypt: ')
    const key = await atlantis.key(algorithm)
    atlantis.uncompress(src, algorithm, key)
  })

program.parse(process.argv)
