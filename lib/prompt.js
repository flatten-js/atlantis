const read = require('read')
const readline = require('readline')


class Prompt {
  constructor() {}

  async _prompt(message) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(message, answer => { rl.close(); resolve(answer) }))
  }

  async input(message) {
    return this._prompt(message)
  }

  async confirm(message) {
    message = message.trim() + ' (Y/n) '
    const answer = await this._prompt(message)
    return !(answer && /^no?/i.test(answer))
  }

  async secret(message) {
    return new Promise(resolve => read({ prompt: message, silent: true }, (_, input) => resolve(input)))
  }

  async call(message, limit) {
    message = message.trim()
    limit = Math.round(limit)

    return new Promise(resolve => {
      let pass = true
      const data_handler = () => pass || finish(timer, true)

      const write = limit => {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`${message} (${limit}) `)
      }

      const finish = (timer, flag) => {
        clearTimeout(timer)
        process.stdin.pause()
        process.stdin.setRawMode(false)
        process.stdin.removeListener('data', data_handler)
        process.stdout.write(`${flag}\n`)
        resolve(flag)
      }

      let timer = setTimeout(function run() {
        if (limit < 0) return finish(timer, false)
        write(limit--)
        timer = setTimeout(run, 1000)
      }, 0)

      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on('data', data_handler)
      setTimeout(() => pass = false, 100)
    })
  }
}

module.exports = new Prompt()
