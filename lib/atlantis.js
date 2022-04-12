require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')
const { spawn } = require('child_process')

const archiver = require('archiver')
const unzipper = require('unzipper')
const chokidar = require("chokidar")

const { ALGORITHM, encrypt, decrypt } = require('./crypt.js')
const prompt = require('./prompt.js')
const { sleep, done } = require('./utils.js')


class Atlantis {
  constructor() {}

  static async key(algorithm, is_compress) {
    switch (algorithm) {
      case ALGORITHM.RSA:
        if (is_compress) return process.env.RSA_PUBLIC_KEY
        return await prompt.secret('Please enter your private key: ')

      case ALGORITHM.AES:
        return await prompt.secret('Please enter your common key: ')

      default:
        return null
    }
  }

  async compress(src, algorithm, key, to = '../') {
    try {
      const stat = fs.statSync(src)
      if (!stat.isDirectory()) throw { code: 'ENOTDIR' }
    } catch (e) {
      throw new Error(`[${e.code}] Failed to read folder to encrypt`)
    }

    const dest = path.join(src, to, randomUUID())
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip')
    archive.pipe(encrypt(algorithm, key)).pipe(output)
    archive.directory(src, path.basename(src))
    await archive.finalize()
  }

  async vanish(dest, algorithm, key, is_compress) {
    const target = fs.readdirSync(dest).find(f => fs.statSync(path.join(dest, f)).isDirectory())
    if (target && Number(is_compress)) {
      const src = path.join(dest, target)
      await this.compress(src, algorithm, key, '../../')
    }
    while (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
      await sleep(1000)
    }
  }

  _on_exit_signal(dest, algorithm, key) {
    let is_compress = true
    let timer = null

    if (process.env.TIMEOUT) {
      const timeout = process.env.TIMEOUT * 1000
      timer = setTimeout(async function run() {
        const answer = await prompt.call('Press any key to cancel the timeout', 60)
        if (answer) return timer = setTimeout(run, timeout)
        throw new Error('Call uncaughtException to connect to subsequent processing')
      }, timeout)
    }

    process.on('SIGINT', async () => {
      clearTimeout(timer)
      is_compress = await prompt.confirm('Do you want to encrypt again?')
      throw new Error('Call uncaughtException to connect to subsequent processing')
    })

    ;[
      'beforeExit', 'uncaughtException', 'unhandledRejection',
      'SIGHUP', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
      'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
      'SIGUSR2', 'SIGTERM'
    ].forEach(signal => {
      process.on(signal, async _ => {
        if (ALGORITHM.RSA == algorithm) key = await Atlantis.key(algorithm, true)
        const args = [dest, algorithm, key, Number(is_compress)]
        const options = { detached: true, stdio: 'ignore' }
        const subprocess = spawn('node', ['./bin/vanish.js', ...args], options)
        subprocess.unref()
        process.exit(0)
      })
    })
  }

  async uncompress(src, algorithm, key) {
    try {
      var stat = fs.statSync(src)
      if (!stat.isFile()) throw { code: 'EISDIR' }
    } catch (e) {
      throw new Error(`[${e.code}] Failed to read file to decrypt`)
    }

    const dest = path.join(path.dirname(src), 'atlantis')
    const input = fs.createReadStream(src)
    const output = unzipper.Extract({ path: dest })

    output.on('finish', async () => {
      const passed = await done(5, () => fs.existsSync(dest))
      if (!passed) throw new Error('An unexpected error has occurred')

      fs.copyFileSync('./assets/README.txt', path.join(dest, 'README.txt'))
      const watcher = chokidar.watch(dest, { depth: 0 })
      const handler = p => fs.rmSync(p, { recursive: true, force: true })
      watcher.on('ready', () => { watcher.on('add', handler); watcher.on('addDir', handler) })
    })

    input.pipe(decrypt(algorithm, key, stat.size)).pipe(output)

    this._on_exit_signal(dest, algorithm, key)
    while (1) await sleep(1000)
  }
}

module.exports = Atlantis
