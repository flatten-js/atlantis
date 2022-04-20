import readline from 'readline'

import read from 'read'


class Prompt {
  constructor() {}

  private async prompt(message: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(message, (answer) => { rl.close(); resolve(answer) }))
  }

  async input(message: string): Promise<string> {
    return await this.prompt(message)
  }

  async secret(message: string): Promise<string> {
    return new Promise(resolve => read({ prompt: message, silent: true }, (_, input) => resolve(input)))
  }

  async confirm(message: string): Promise<boolean> {
    message = message.trim() + ' (Y/n) '
    const answer = await this.prompt(message)
    return !(answer && /^no?/i.test(answer))
  }

  async call(message: string, limit: number): Promise<boolean> {
    message = message.trim()
    limit = Math.round(limit)

    return new Promise(resolve => {
      let pass = true
      const data_handler = () => pass || finish(timer, true)

      const write = (limit: number) => {
        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)
        process.stdout.write(`${message} (${limit}) `)
      }

      const finish = (timer: NodeJS.Timeout, flag: boolean) => {
        clearTimeout(timer)
        process.stdin.pause()
        process.stdin.setRawMode(false)
        process.stdin.removeListener('data', data_handler)
        process.stdout.write(`${flag}\n`)
        return resolve(flag)
      }

      let timer: NodeJS.Timeout = setTimeout(function run() {
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

export const prompt = new Prompt()
