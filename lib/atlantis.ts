require('dotenv').config()

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { spawn, SpawnOptions } from 'child_process'

import archiver from 'archiver'
import unzipper from 'unzipper'
import chokidar from 'chokidar'

import { ALGORITHM, encrypt, decrypt } from './crypt'
import { prompt } from './prompt'
import { sleep, run } from './utils'


class Atlantis {
  private target: string

  constructor() {
    this.target = ''
  }

  async key(algorithm: ALGORITHM, is_compress?: boolean): Promise<string> {
    switch (algorithm) {
      case ALGORITHM.RSA:
        if (is_compress) return process.env.RSA_PUBLIC_KEY || ''
        return await prompt.secret('Please enter your private key: ')

      case ALGORITHM.AES:
        return await prompt.secret('Please enter your common key: ')

      default:
        return ''
    }
  }

  async compress(src: string, algorithm: ALGORITHM, key: string, to: string = '../'): Promise<void> {
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

  async vanish(dest: string, target: string, algorithm: ALGORITHM, key: string, is_compress: string): Promise<void> {
    try {
      if (!+is_compress) return
      const src = path.join(dest, target)
      await this.compress(src, algorithm, key, '../../')
    } finally {
      while (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true })
        await sleep(1000)
      }
    }
  }

  private async on_update_atlantis(dest: string): Promise<void> {
    this.target = await run<string>(() => fs.readdirSync(dest)[0], 100, v => v)
    fs.copyFileSync('./assets/README.txt', path.join(dest, 'README.txt'))
    const master = [this.target, 'README.txt'].map(f => fs.statSync(path.join(dest, f)).ino)

    const watcher = chokidar.watch(dest, { depth: 0, alwaysStat: true })
    watcher.on('ready', () => {
      ['add', 'addDir'].forEach(name => {
        watcher.on(name, async (p, stat) => {
          if (master[0] == stat.ino) this.target = path.basename(p)
          if (master.includes(stat.ino)) return
          await run<void>(() => fs.renameSync(p, path.join(dest, this.target, path.basename(p))), 10)
        })
      })
    })
  }

  private async on_exit_signal(dest: string, algorithm: ALGORITHM, key: string): Promise<void> {
    let is_compress = true
    let timer: NodeJS.Timer|null = null

    if (process.env.TIMEOUT) {
      const timeout = Number(process.env.TIMEOUT) * 1000
      timer = setTimeout(async function run(): Promise<NodeJS.Timer> {
        const answer = await prompt.call('Press any key to cancel the timeout', 60)
        if (answer) return timer = setTimeout(run, timeout)
        throw new Error('Call uncaughtException to connect to subsequent processing')
      }, timeout)
    }

    process.on('SIGINT', async () => {
      if (timer) clearTimeout(timer)
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
        if (ALGORITHM.RSA == algorithm) key = await this.key(algorithm, true)
        const args = [dest, this.target, algorithm, key, String(+is_compress)]
        const options: SpawnOptions = { detached: true, stdio: 'ignore' }
        const subprocess = spawn('node', ['./bin/vanish.js', ...args], options)
        subprocess.unref()
        process.exit(0)
      })
    })
  }

  async uncompress(src: string, algorithm: ALGORITHM, key: string): Promise<void> {
    try {
      var stat = fs.statSync(src)
      if (!stat.isFile()) throw { code: 'EISDIR' }
    } catch (e) {
      throw new Error(`[${e.code}] Failed to read file to decrypt`)
    }

    const dest = path.join(path.dirname(src), 'atlantis')
    const input = fs.createReadStream(src)
    const output = unzipper.Extract({ path: dest })
    input.pipe(decrypt(algorithm, key, stat.size)).pipe(output)
    this.on_update_atlantis(dest)
    this.on_exit_signal(dest, algorithm, key)
    while (1) await sleep(1000)
  }
}

export { Atlantis }
