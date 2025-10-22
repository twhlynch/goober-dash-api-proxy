# goober-dash-api-proxy

Allows making requests to the goober dash API though a proxy account
that creates a new session to auth each request.

This version is setup to only allow requests from my domain, but
that can easily be changed in `worker.js`. Additionally allowed paths
are a whitelist that can also be changed.

- `levels_editor_get`
- `player_fetch_data`
- `levels_query_curated`
- `time_trial_query_leaderboard`
- `query_player_profile`

Credit to \@shadow_surf (discord) for the idea.

## env setup
1. create `wrangler.toml`

```toml
name = "goober-dash-api-proxy"
main = "./worker.js"
compatibility_date="2023-05-18"
compatibility_flags = [ "nodejs_compat" ]

[vars]
GD_EMAIL = "..."
GD_PASSWORD = "..."
```

2. deploy

```sh
wrangler deploy
```