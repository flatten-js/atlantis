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
}

module.exports = new Prompt()
