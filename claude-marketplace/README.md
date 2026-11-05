# jinnux Claude Code marketplace

Claude Code plugins. One for now: **peepcraft**, the PeepCraft MCP server (`examples/peeps-mcp`) and a skill that knows how to use it.

```bash
claude plugin marketplace add ./claude-marketplace
claude plugin install peepcraft@jinnux
```

- **MCP URL:** a plugin setting (`mcp_url`, `/config` or the plugin's page in `/plugin`), default `https://peepcraft-mcp.jinnux.com/mcp`; `https://peepcraft-mcp.jinnux.workers.dev/mcp` is the same server.
- **Updates:** added from this local path, the plugin loads in place: every new session (or `/reload-plugins`) has the current files, no update step. Once this folder is pushed to a git host and added from there, release by raising `version` in `plugins/peepcraft/.claude-plugin/plugin.json`; users get it with `/plugin marketplace update jinnux`, or on their own with auto-update on (`/plugin` → Marketplaces → jinnux → Enable auto-update).
- **Check:** `claude plugin validate ./claude-marketplace`.
