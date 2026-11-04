// A PNG drawn in the terminal, by the two protocols terminals share. Tmux swallows both unless it is set to pass them on, so it counts as none.
export type ImageProtocol = 'kitty' | 'iterm'

export function terminalImages(env: Record<string, string | undefined>): ImageProtocol | undefined {
  // Terminals inside a multiplexer or over ssh often cannot be told apart, so the owner can say.
  if (env.PEEP_IMAGES === 'kitty' || env.PEEP_IMAGES === 'iterm') return env.PEEP_IMAGES
  if (env.TMUX) return undefined
  if (env.KITTY_WINDOW_ID || env.TERM === 'xterm-kitty' || env.TERM_PROGRAM === 'ghostty') return 'kitty'
  if (env.TERM_PROGRAM === 'iTerm.app' || env.TERM_PROGRAM === 'WezTerm') return 'iterm'
  return undefined
}

export function imageSequence(png: Uint8Array, protocol: ImageProtocol): string {
  const data = Buffer.from(png).toString('base64')
  if (protocol === 'iterm') return `\x1b]1337;File=inline=1;size=${png.length}:${data}\x07`
  // The kitty protocol takes base64 in pieces of at most 4096 bytes; m=1 says more follow.
  const pieces = data.match(/.{1,4096}/g) ?? []
  return pieces.map((piece, i) => `\x1b_G${i === 0 ? 'a=T,f=100,' : ''}m=${i < pieces.length - 1 ? 1 : 0};${piece}\x1b\\`).join('')
}
