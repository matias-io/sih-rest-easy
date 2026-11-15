# Notification sound coverage

Sources checked on 2026-11-15. Every recording in `sources.json` matches its stored SHA-256 and its official source bytes. Discord's CDN requires a browser User-Agent for these requests. Teams and Windows were verified against the installed Microsoft files; Slack and Discord against their recorded CDN URLs.

| Feed event | Sound |
| --- | --- |
| Slack message | Slack Knock Brush, official Slack CDN |
| Teams message | `teams_notification.mp3`, installed Teams package |
| Teams incoming call | `ring.mp3`, installed Teams package |
| Discord message | Discord message, official Discord CDN |
| Discord incoming call | Discord ringtone, official Discord CDN |
| Discord voice join / leave | Discord join / leave, official Discord CDN |
| PagerDuty incident | `notification.mp3` from [PagerDuty/chrome-notifier](https://github.com/PagerDuty/chrome-notifier), Apache 2.0 |
| Outlook email | Windows Notify Email |
| Google Calendar reminder | Windows Notify Calendar fallback |
| Windows update / printer alert | Windows Exclamation |
| GitHub, Jira, Vercel, AWS Billing, Claude, Cursor, Cloudflare, npm, LinkedIn, Zoom, Docker Desktop, ChatGPT, NVIDIA App, Stack Overflow, fictional MLG messages | Windows Notify System Generic fallback |

PagerDuty's recording is from its Chrome extension, not a verified current mobile ringtone. The generic fallbacks above are OS recordings, not claims of app-specific official sounds. Calendar supports browser and desktop alerts; this implementation uses the Windows calendar fallback rather than claiming a verified Google recording. No new vendor recording was verified for the other fallback apps in this pass.

The local server can replace only generic OS sounds with the host's sound files. It cannot replace Slack, Teams, Discord or PagerDuty recordings. Dismissal, eviction, rest and End still stop active sounds. The train horn is no longer registered or triggered; the legacy file remains unused.

Official references:

- [Slack sound preferences](https://slack.com/help/articles/201355156-Configure-your-Slack-notifications)
- [Teams notification sounds](https://support.microsoft.com/en-us/teams/notifications-settings/manage-notifications-in-microsoft-teams)
- [Discord default sound pack](https://support.discord.com/hc/en-us/articles/28692828968215-Winter-Ringtone-and-Sounds-2025-FAQ)
- [Google Calendar notification types](https://support.google.com/calendar/answer/37242)
- [GitHub notification channels](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications)

Exact recording URLs, original Microsoft paths and hashes are in `sources.json`. The PagerDuty source URL is pinned to a commit and its license is in `pagerduty-LICENSE.txt`.
