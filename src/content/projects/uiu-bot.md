---
title: UIU Bot
slug: uiu-bot
description: A Discord bot engineered for UIU students automated scheduling, resource management, and moderation tools.
tools:
  - Python
  - Discord.py
  - AsyncIO
thumbnail: ""
source_code: https://github.com/mdanikhasan-dev/UIU-BOT-Discord
live_demo: https://discord.com/oauth2/authorize?client_id=1434163768488890549&permissions=8&integration_type=0&scope=bot+applications.commands
featured: true
---

## UIU Bot

UIU Bot is a Discord bot for United International University communities. It brings together UIU notices, academic calendar info, server utilities, and quick admin setup in one place.

## Why This Bot Is Useful

- Pulls the latest UIU notices directly into Discord.
- Posts new notices automatically to a channel you choose.
- Shows key academic calendar dates on demand.
- Includes quality-of-life commands like polls, help, ping, and about.
- Keeps server-specific notice memory so duplicate announcements are avoided.

## Features

| Area | What it does |
| --- | --- |
| UIU Notices | Fetches the latest notices from the UIU website and shows the top results in Discord. |
| Auto Notice Posting | Checks for new notices every 5 minutes and posts only unseen ones to configured channels. |
| Academic Calendar | Displays the current UIU academic calendar from maintained static data. |
| Server Tools | Includes admin setup for notice channels and stop controls for automatic notice posting. |
| Community Utilities | Provides poll creation, help, ping, and about commands. |

## Slash Commands

| Command | Access | Description |
| --- | --- | --- |
| `/help` | Everyone | Shows the full command list. |
| `/ping` | Everyone | Checks bot latency. |
| `/about` | Everyone | Displays bot info and invite details. |
| `/poll` | Everyone | Creates a poll with up to 10 options. |
| `/notices` | Everyone | Shows the latest 3 UIU notices. |
| `/calendar` | Everyone | Shows important academic calendar dates. |
| `/setup` | Admin | Sets the channel for automatic UIU notice posts. |
| `/stop_notices` | Admin | Disables automatic notice posting for the server. |

## Quick Start

```bash
git clone https://github.com/Sawlper/UIU-BOT-Discord.git
cd UIU-BOT-Discord
```

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

```bash
pip install -r requirements.txt
python main.py
```

## Configuration

| File | Key | Purpose |
| --- | --- | --- |
| `config/settings.py` | `BOT_NAME` | Bot display name used in responses and startup logs. |
| `config/settings.py` | `BOT_VERSION` | Tracks the current bot version. |
| `config/settings.py` | `NOTICE_CHECK_INTERVAL_MINUTES` | Controls how often the bot checks for new notices. |
| `config/settings.py` | `MAX_SEEN_NOTICES` | Caps stored notice history per server. |
| `.env` | `DISCORD_TOKEN` | Discord bot token required to connect. |

## Tech Stack

- Python
- discord.py
- python-dotenv
- requests
- beautifulsoup4

## Notes

- The bot uses slash commands and syncs them when the app starts.
- Notice scraping is wrapped safely so one failed fetch does not kill the background loop.
- Academic calendar data is currently static and should be updated manually each semester.
- UI previews can be added later as project assets if you want richer media on the portfolio page.
