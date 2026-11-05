// From photo with the visitor's own Anthropic API key: the browser calls Claude itself, so the photo and the key go straight to Anthropic,
// never to PeepCraft's Worker, and the visitor's account pays. Loaded only when a visitor has given a key (import() in main.tsx), so the
// SDK is not in the page's first download.
import Anthropic from '@anthropic-ai/sdk'
import { checkImage, match, perceiveRequest, readPerception, type PeepCraftDoc } from '@kit/peeps-engine'

/** Anthropic promises only that a key starts with sk-ant- (sk-ant-api, sk-ant-usr and sk-ant-svc are in use), so only what cannot call Messages
 *  with this header is refused here: a Claude Code token (sk-ant-oat) and an Admin key (sk-ant-admin). Anything else, Anthropic decides. */
export const looksLikeKey = (key: string) => /^sk-ant-(?!oat|admin)[\w-]{20,}$/.test(key)

export async function readWithKey(apiKey: string, image: { data: string; mediaType: string }): Promise<{ doc: PeepCraftDoc; people: 'one' | 'many' }> {
  checkImage(image)
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  let reply
  try {
    reply = await client.beta.messages.create(perceiveRequest(image) as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming)
  } catch (e) {
    // Said plainly; the provider's own message is left out, as it may repeat request details.
    // Two refusals a visitor can act on, told apart only by their wording: the rest of the message stays out.
    if (e instanceof Anthropic.BadRequestError && /anthropic-workspace-id/.test(e.message)) throw new Error('This key is not scoped to a workspace, and PeepCraft cannot choose one. In the Claude Console, create a key for one workspace.')
    if (e instanceof Anthropic.AuthenticationError && /CORS requests are not allowed/.test(e.message)) throw new Error('Your Anthropic organization does not allow calls from a browser, so From photo cannot work with this key.')
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Anthropic did not accept your key. Check it, or forget it and give another.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Anthropic is rate limiting your key. Try again in a minute.')
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Anthropic could not be reached. Check the connection and try again.')
    if (e instanceof Anthropic.APIError) throw new Error(`Anthropic refused the photo with your key (${e.status ?? 'no status'}).`)
    throw e
  }
  const { attributes, people } = readPerception(reply)
  return { doc: match(attributes).doc, people }
}
