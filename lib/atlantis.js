require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { spawn } = require('child_process')

const archiver = require('archiver')
const unzipper = require('unzipper')

const { ALGORITHM, encrypt, decrypt } = require('./crypt.js')
const { sleep, prompt } = require('./utils.js')


class Atlantis {
  constructor() {}

  static async key(algorithm, is_compress) {
    switch (algorithm) {
      case ALGORITHM.RSA:
        if (is_compress) return process.env.RSA_PUBLIC_KEY
        return await prompt('Please enter your private key: ')

      case ALGORITHM.AES:
        return await prompt('Please enter your common key: ')

      default:
        return null
    }
  }

  async compress(src, algorithm, key, to = '../') {
    const dest = path.join(src, to, randomUUID())
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip')
    archive.pipe(encrypt(key, algorithm)).pipe(output)
    archive.directory(src, path.basename(src))
    await archive.finalize()
  }

  async vanish(dest, algorithm, key) {
    const target = fs.readdirSync(dest)[0]
    if (target) {
      const src = path.join(dest, target)
      await this.compress(src, algorithm, key, '../../')
    }
    fs.rmSync(dest, { recursive: true, force: true })
  }

  async uncompress(src, algorithm, key) {
    const dest = path.join(path.dirname(src), 'atlantis')
    const input = fs.createReadStream(src)
    const output = unzipper.Extract({ path: dest })
    const total = fs.statSync(src).size
    input.pipe(decrypt(key, algorithm, total)).pipe(output)

    ;[
      'beforeExit', 'uncaughtException', 'unhandledRejection',
      'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
      'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
      'SIGUSR2', 'SIGTERM'
    ].forEach(signal => process.on(signal, async _ => {
      if (ALGORITHM.RSA == algorithm) key = await Atlantis.key(algorithm, true)
      const options = { detached: true, stdio: 'ignore' }
      const subprocess = spawn('node', ['./bin/vanish.js', dest, algorithm, key], options)
      subprocess.unref()
      process.exit(0)
    }))

    while (1) await sleep(1000)
  }
}

module.exports = Atlantis
