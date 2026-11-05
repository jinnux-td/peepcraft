// The two plain pages, made by build.mjs from page.html. The privacy page says only what the code does; change it when the code changes.
export const pages = {
  privacy: {
    title: 'Privacy · PeepCraft',
    description: 'What PeepCraft does with your pictures and photos, and what it does not keep.',
    body: `<h1>Privacy</h1>
<p>PeepCraft needs no account and sets no cookies of its own. Last updated 5 November 2026.</p>
<h2>What you draw</h2>
<p>Your peep stays in your browser. Pictures you upload to a scene are kept in this browser's storage. A share link holds the peep in the part of the address after the <code>#</code>, which browsers do not send to a server, so it reaches only the people you give the link to.</p>
<h2>From photo</h2>
<p>From photo uses your own Anthropic API key. Your browser sends the photo and the key straight to Anthropic, never to PeepCraft, and your Anthropic account pays. The key is kept in this tab only, until you forget it or close the tab. <a href="https://www.anthropic.com/legal/privacy">Anthropic's privacy policy</a> and your terms with Anthropic apply to the photo.</p>
<h2>Visits</h2>
<p>Cloudflare hosts this site, and Cloudflare Web Analytics counts visits. <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a> applies to what it handles, including its protection against bots.</p>
<h2>The art</h2>
<p>Open Peeps and Transhumans are by Pablo Stanley, under CC0, so you may use what you make however you like.</p>
<h2>Questions</h2>
<p>Write to <a href="mailto:datnguyen26.work@gmail.com">datnguyen26.work@gmail.com</a>.</p>
<p><a href="/">Back to PeepCraft</a></p>`,
  },
  404: {
    title: 'Not found · PeepCraft',
    description: 'This page does not exist.',
    body: `<h1>This page does not exist</h1>
<p>The address may be mistyped, or the page may have moved.</p>
<p><a href="/">Open PeepCraft</a></p>`,
  },
};
