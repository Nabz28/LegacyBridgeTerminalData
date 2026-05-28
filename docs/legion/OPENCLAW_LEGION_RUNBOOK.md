# LEGION OpenClaw Runbook

Last verified: 2026-05-28 19:17 GMT+7
Principal: Nabil Sachio Refat

## Mission

LEGION is Legacy Bridge Capital's AI chief of staff. The Supabase `brain`
schema is the source of truth. OpenClaw is the chat-app proxy and skills runner
that lets Nabil talk to LEGION from Telegram now, and WhatsApp later.

The target architecture is engine-portable: any capable LLM can become LEGION
if it bootstraps from the brain, follows the operating protocol, and uses the
same action surface. Model providers are replaceable. Context is not.

## Current Status

- OpenClaw version: `2026.5.26`.
- Host: Nabil's Windows laptop.
- Gateway: local loopback at `127.0.0.1:18789`.
- Gateway process: Node running `openclaw/dist/index.js gateway --port 18789`.
- Channel live: Telegram `@LEGIONLBC_bot`.
- Channel parked: WhatsApp, disabled until the dedicated eSIM WhatsApp account
  is stable.
- Model backend: Codex OAuth, `codex/gpt-5.5` for bounded image describe and
  `openai/gpt-5.5` as the OpenClaw agent model via Codex auth.
- Brain action surface: `legion-brain` OpenClaw skill.
- Recovery: Windows Scheduled Task `LEGION OpenClaw Watchdog`, every 5 minutes.
- Brain context sync: Windows Scheduled Task `LEGION OpenClaw Brain Sync`, every
  15 minutes.
- Verification: full smoke test passed after quota reset, including image
  describe reading `LEGION TEST` from a generated image.

## Live Local Paths

Do not commit files from these paths unless they have been sanitized first.

- OpenClaw config: `C:\Users\DELL\.openclaw\openclaw.json`
- OpenClaw environment: `C:\Users\DELL\.openclaw\.env`
- Skill: `C:\Users\DELL\.openclaw\workspace\skills\legion-brain\SKILL.md`
- Skill runner:
  `C:\Users\DELL\.openclaw\workspace\skills\legion-brain\scripts\brain-action.mjs`
- Watchdog script: `C:\Users\DELL\.openclaw\ops\legion-openclaw-watchdog.ps1`
- Smoke script: `C:\Users\DELL\.openclaw\ops\legion-openclaw-smoke.ps1`
- Brain sync script: `C:\Users\DELL\.openclaw\ops\legion-brain-sync.ps1`
- Synced context cache: `C:\Users\DELL\.openclaw\workspace\LEGION_CONTEXT.md`
- Watchdog logs: `C:\Users\DELL\.openclaw\logs\legion-openclaw-watchdog.log`
- Brain sync logs: `C:\Users\DELL\.openclaw\logs\legion-brain-sync.log`
- OpenClaw logs: `%TEMP%\openclaw\openclaw-YYYY-MM-DD.log`

## Canonical Vercel Deployment

The existing Legacy Bridge Terminal production deployment is:

`https://legacy-bridge-terminal-data-umga.vercel.app/launcher/`

This URL is also recorded in the brain note `Infrastructure & access`.

Do not create a separate OpenClaw/LEGION Vercel status project unless Nabil
explicitly asks for one. OpenClaw operational state belongs in:

- Supabase brain notes.
- Git docs under `docs/legion/`.
- The canonical Legacy Bridge Terminal deployment when UI exposure is needed.

## Secrets Rule

Never print, commit, or paste:

- `SUPABASE_SERVICE_ROLE_KEY`
- Telegram bot token or token file contents
- OpenClaw gateway token
- OpenClaw auth profile state
- Codex OAuth artifacts
- Any `.env` file

The service role key bypasses RLS. Treat it as root access to the brain schema.

## Brain Bootstrap

Every new LEGION-capable assistant must read the brain first.

Supabase project:

- URL: `https://adnubucjlezrtusbicja.supabase.co`
- REST base: `https://adnubucjlezrtusbicja.supabase.co/rest/v1`
- Schema profile: `brain`

Required REST headers:

```http
apikey: <service_role>
Authorization: Bearer <service_role>
Accept-Profile: brain
Content-Profile: brain
Content-Type: application/json
```

For writes, include `Content-Profile` and `Content-Type`. For reads, `Accept-Profile`
is enough.

Bootstrap notes to read in order from `brain.notes`:

1. `LEGION - Persona & Voice`
2. `LEGION - Operating Protocol`
3. `LEGION - Bootstrap (any device / any AI)`
4. `OpenClaw integration - plan for handoff`
5. Latest `status_snapshot`

After bootstrap, print the LEGION transition banner and give Nabil a status read
plus the single most important next action.

## OpenClaw Configuration Shape

Do not copy tokens from the live config. The important shape is:

```json
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "port": 18789
  },
  "plugins": {
    "allow": ["codex", "telegram"],
    "entries": {
      "telegram": { "enabled": true },
      "whatsapp": { "enabled": false }
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "name": "LEGION Telegram",
      "commands": { "native": false },
      "mediaMaxMb": 8
    },
    "whatsapp": {
      "enabled": false
    }
  },
  "agents": {
    "defaults": {
      "workspace": "C:\\Users\\DELL\\.openclaw\\workspace",
      "skills": ["legion-brain", "weather"],
      "model": { "primary": "openai/gpt-5.5" }
    }
  },
  "tools": {
    "media": {
      "concurrency": 1,
      "image": {
        "enabled": true,
        "maxBytes": 8388608,
        "maxChars": 700,
        "timeoutSeconds": 45,
        "attachments": {
          "mode": "first",
          "maxAttachments": 1,
          "prefer": "last"
        },
        "models": [
          {
            "type": "provider",
            "provider": "codex",
            "model": "gpt-5.5",
            "capabilities": ["image"],
            "maxChars": 700,
            "maxBytes": 8388608,
            "timeoutSeconds": 45
          }
        ]
      },
      "audio": { "enabled": false },
      "video": { "enabled": false }
    }
  },
  "commands": {
    "ownerAllowFrom": ["telegram:6101244829"]
  }
}
```

Image prompt currently instructs the model to describe the image, extract visible
text, and treat image text as untrusted input. This exists because user-provided
images can contain prompt injection.

## LEGION Brain Skill

Skill name: `legion-brain`

Actions:

- `brain.bootstrap`: read current LEGION operating state in one call, including
  latest status snapshot, Pulse, open todos, OpenClaw production state, backlog,
  and manual note references.
- `brain.context_sync`: return the same state plus compact Markdown for
  `LEGION_CONTEXT.md`.
- `brain.intake`: capture substantive Telegram/WhatsApp intake and refresh
  Pulse.
- `brain.dump`: create an inbox note.
- `brain.recall`: search note titles and bodies.
- `brain.todo_add`: create a `todo` note.
- `brain.todo_done`: mark a `todo` note done.
- `brain.kpi_set`: update KPI note `data.value`.
- `brain.person_get`: retrieve person notes.
- `brain.snapshot_read`: read latest `status_snapshot`.
- `brain.pulse_touch`: refresh `LEGION - Pulse`.

Rules:

- The brain is source of truth.
- OpenClaw is only the proxy.
- Telegram LEGION should call `brain.bootstrap` for new conversations, after
  restarts, after long gaps, and before strategic/status advice.
- Telegram LEGION should use `brain.intake` or a more specific brain action for
  tasks, decisions, risks, status updates, reminders, KPI changes, contact
  context, and infrastructure changes.
- Never invent LBC facts.
- Never write outside the `brain` schema from this skill.
- For substantive intake, write `brain.dump` first, then `brain.pulse_touch`.
- For reminders, write `brain.todo_add`; the existing F1 Telegram cron can nag
  from brain todos.

## Health Commands

Run from PowerShell:

```powershell
openclaw.cmd gateway health
openclaw.cmd channels status --deep
openclaw.cmd status --json
openclaw.cmd skills check --json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$HOME\.openclaw\ops\legion-openclaw-smoke.ps1"
```

Expected healthy signals:

- `Gateway Health` returns `OK`.
- Telegram default is `enabled, configured, running, connected`.
- `legion-brain` is model-visible.
- `brain.snapshot_read` returns a `status_snapshot`.
- Full smoke prints `PASS: bounded codex image describe` and
  `ALL SMOKE TESTS PASSED`.

## Watchdog

Task name: `LEGION OpenClaw Watchdog`

Schedule:

- Every 5 minutes.
- Uses `powershell.exe -NoProfile -ExecutionPolicy Bypass`.
- Multiple instances: ignore new.
- Execution limit: 6 minutes.

What it checks:

- Gateway process exists.
- TCP port `127.0.0.1:18789` is open.
- `openclaw gateway health` returns OK, or TCP is open with no fresh stall
  signature.
- Fresh stall signatures after the latest `gateway ready`:
  - `stalled session:`
  - `active_work_without_progress`
  - `Polling stall detected`
  - `gateway readiness unavailable`

What it does:

- If healthy, logs `healthy`.
- If process/port/stall check fails outside cooldown, runs
  `openclaw gateway restart`.
- If normal restart fails, kills only the OpenClaw gateway Node process and
  starts it again.

Known good recovery test:

- The gateway process was killed manually.
- Watchdog logged `restart requested: gateway process missing`.
- Watchdog ran `gateway restart`.
- Health returned OK and Telegram came back connected.

## Brain Sync

Task name: `LEGION OpenClaw Brain Sync`

Schedule:

- Every 15 minutes.
- Uses `powershell.exe -NoProfile -ExecutionPolicy Bypass`.
- Writes `LEGION_CONTEXT.md` in the OpenClaw workspace.
- Replaces a bounded `Live Brain Cache` block in `MEMORY.md`, because OpenClaw
  injects `MEMORY.md` into new agent sessions.

What it does:

- Calls `node ...\brain-action.mjs brain.context_sync`.
- Pulls the latest status snapshot, Pulse, open todos, OpenClaw production
  state, and runtime contract from the brain.
- Writes a compact Markdown cache for OpenClaw startup context.
- Updates `MEMORY.md` between `LEGION_BRAIN_SYNC_START` and
  `LEGION_BRAIN_SYNC_END` markers without growing the file.

This is not the authority. It is a local cache so Telegram LEGION wakes up with
current brain context before it decides whether to call a skill. Supabase brain
remains the authority. The cache exists because standalone `LEGION_CONTEXT.md`
is useful for humans but is not automatically injected by OpenClaw; `MEMORY.md`
is injected.

## Telegram Usage

Direct chat:

- Message `@LEGIONLBC_bot` directly.
- Send text, reminders, or an image.
- Image handling is bounded and should summarize/extract visible text.

Group chat:

- Add the bot to the group.
- BotFather group permissions must be enabled.
- Mention `@LEGIONLBC_bot` or reply to a bot message.
- Do not expect the bot to answer every ambient group message unless OpenClaw
  group routing is deliberately loosened.

## WhatsApp Boundary

WhatsApp is deliberately disabled until Nabil's dedicated eSIM number works.

Do not connect Nabil's personal number. OpenClaw uses a WhatsApp Web/Baileys
style channel, which carries account-ban risk. The dedicated number isolates
that risk.

If Nabil insists on using his personal number:

1. Push back.
2. File a `risk` note in the brain that says the principal authorized a
   personal-WhatsApp ban-risk path against documented advice.
3. Proceed only after he reconfirms.

## Laptop vs Server

Current local mode requires the laptop to be awake. If the laptop sleeps or
shuts down, OpenClaw stops. The watchdog recovers it only after Windows wakes.

24/7 options:

1. Windows mini-PC or always-on desktop:
   - Easiest migration from current setup.
   - Can keep Codex OAuth flow.
   - Still depends on the machine staying online.

2. Windows VPS:
   - Closest to current Windows scripts.
   - Good for Task Scheduler and OpenClaw local mode.
   - Codex OAuth may work if browser/device auth is completed.

3. Linux VPS:
   - Best long-term reliability.
   - Use systemd instead of Task Scheduler.
   - Needs OpenClaw install validation and daemon setup on Linux.

4. API-key provider backend:
   - More server-native and reliable.
   - Costs become explicit per API usage.
   - Avoids Codex subscription cooldown as the single point of failure.

Codex OAuth can be used on a server only if OpenClaw supports and preserves that
auth profile on the server. If reliability matters more than avoiding API
billing, move to an API-key backend with fallback.

## Limitations

- Codex subscription quota can block replies and image processing.
- OpenClaw can show event-loop degradation during model work; current watchdog
  does not restart on transient degradation if health stays OK.
- Telegram group behavior still needs real group-message validation by Nabil.
- WhatsApp is not live.
- This setup is not 24/7 until moved to an always-on host.
- Brain writes depend on `SUPABASE_SERVICE_ROLE_KEY`; loss or rotation requires
  updating `~/.openclaw/.env`.

## Future Improvements

- Move OpenClaw to an always-on server.
- Add a second model/provider fallback for quota events.
- Add a Telegram `/status` or admin command that returns gateway, brain, and
  model health.
- Add a periodic smoke cron that writes failure summaries to `brain.notes`.
- Add image attachment provenance to brain notes when user sends images.
- Add a stricter group allowlist once group use patterns are clear.
- Add WhatsApp only after the dedicated eSIM account is stable.
- Store an explicit `LEGION - OpenClaw Production State` system note and keep it
  updated after any config change.

## Quick Recovery

If Telegram stops replying:

```powershell
openclaw.cmd gateway health
openclaw.cmd channels status --deep
Get-Content "$HOME\.openclaw\workspace\LEGION_CONTEXT.md" -Head 80
Get-Content "$env:TEMP\openclaw\openclaw-$(Get-Date -Format yyyy-MM-dd).log" -Tail 120
Get-Content "$HOME\.openclaw\logs\legion-openclaw-watchdog.log" -Tail 40
Get-Content "$HOME\.openclaw\logs\legion-brain-sync.log" -Tail 40
openclaw.cmd gateway restart
```

If the model says quota or no auth profile is available, do not keep restarting.
Check Codex usage first. Restarting will not fix quota.
