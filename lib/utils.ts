export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const run = <T>(cb: () => T, ms: number, validator?: (data: T) => any): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(async function run() {
      try {
        const data = await cb()
        if (validator && !validator(data)) throw {}
        return resolve(data)
      } catch {
        setTimeout(run, ms)
      }
    }, 0)
  })
}
