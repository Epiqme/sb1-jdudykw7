# External services & credentials (names only — no secret values here)

## Core stack

| Service | What it's for | Credential name(s) needed |
| --- | --- | --- |
| HeyGen (app.heygen.com) | Avatar video renders (Video Agent + AI Studio); epiqrichman avatar + voice clone | HeyGen account login; `HEYGEN_API_KEY` (sent as `X-Api-Key` header in n8n). Non-secret IDs in BUILD-LOG.md: avatar_id `9f83824647164b98a58f50873ad1eb18`, voice_id `9d6ce4b3e8d741e78066b4f6db1668af` |
| n8n Cloud (agoravoy.app.n8n.cloud) | CAM workflow host. Trial ends ~7/22 (559/1000 executions used) | n8n account login (email + password) |
| Anthropic API | Claude script-writing node in CAM (model claude-sonnet-5; do NOT set temperature) | `ANTHROPIC_API_KEY` |
| Google Sheets | CAM idea queue / status board | Google account OAuth (connected inside n8n as a Sheets credential) |
| Netlify | Site hosting; auto-publish LOCKED, review permalink deploy id `6a53ed876508f49a24b94e5e` | Netlify account login (deploys done via Netlify Drop) |
| Formspree | Free Deal Scan form backend, form id `mzdljwlw` | Formspree account login |

## Business accounts

| Service | What it's for | Credential name(s) |
| --- | --- | --- |
| Fora Travel portal (advisor.fora.travel) | Agency of record; commissions; IATA# 33520476 | Fora login (epiq.richman@fora.travel) |
| Virgin Voyages First Mates (firstmates.com) | LetsGoBook booking link source (agentId 296153, agencyId 15975) | First Mates login |
| Gmail (agoravoytravel@gmail.com) | Customer contact address on site | Google account login |
| Domain registrar for agoravoy.com | DNS / go-live | Registrar login |
| TikTok / Instagram / social | Posting (business account → Commercial Music Library) | Platform logins |

## Optional / pending decisions

| Service | What for | Credential |
| --- | --- | --- |
| Epidemic Sound (~$10/mo, 30-day trial) or Pixabay (free) | Baked-in music | Account login if adopted |
| Facebook page + Icebreaker group | Community links on site | Facebook login |

## Notes for the next agent

- No secrets are stored anywhere in this repo — they live in n8n's credential store and Epiq's browsers/password manager. Ask Epiq to provide each key when a task needs it.
- The HeyGen credential in n8n MUST use header name `X-Api-Key` (a header named "heygen key" is an invalid HTTP token — this broke CAM once already).
- After ANY n8n workflow edit via API/patch, unpublish+republish (old UI: deactivate+reactivate) or n8n keeps executing the stale version.
