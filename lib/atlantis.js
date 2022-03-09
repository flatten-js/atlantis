const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { spawn } = require('child_process')

const archiver = require('archiver')
const unzipper = require('unzipper')

const { Encrypt, Decrypt } = require('./crypt.js')
const { sleep } = require('./utils.js')


class Atlantis {
  constructor(key) {
    this.key = key
  }

  async compress(src, to = '../', target = null) {
    const dest = path.join(src, to, randomUUID())
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip')
    archive.pipe(new Encrypt(this.key)).pipe(output)
    archive.directory(src, target)
    await archive.finalize()
  }

  async vanish(dest) {
    const target = fs.readdirSync(dest)[0]
    if (target) {
      const src = path.join(dest, target)
      await this.compress(src, '../../', target)
    }
    fs.rmSync(dest, { recursive: true, force: true })
  }

  async uncompress(src, key) {
    const dest = './atlantis'
    const input = fs.createReadStream(src)
    const output = unzipper.Extract({ path: dest })
    input.pipe(new Decrypt(key)).pipe(output)

    ;[
      'beforeExit', 'uncaughtException', 'unhandledRejection',
      'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
      'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
      'SIGUSR2', 'SIGTERM'
    ].forEach(signal => process.on(signal, () => {
      const options = { detached: true, stdio: 'ignore' }
      const subprocess = spawn('node', ['./bin/vanish.js', dest], options)
      subprocess.unref()
      process.exit(0)
    }))

    while (1) await sleep(1000)
  }
}

module.exports = Atlantis
