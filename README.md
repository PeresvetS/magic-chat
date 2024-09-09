# Magic chat setup

## Requirements

1. Docker and Docker Compose
2. make, git, bash/zsh

## Main commands

```bash
# build the app
make app-build
# start the app
make app
# run the app console
make app-bash
# check linting
make app-lint
```

## Getting started

1. Clone the repository and `cd` to project root directory
2. `cp .env.example .env`
3. Create Telegram bots with BotFather (admin bot and user bot)
4. Register on ngrok
5. Add bot tokens and ngrok auth_token into .env file

```
USER_BOT_TOKEN=
ADMIN_BOT_TOKEN=
NGROK_AUTHTOKEN=
```

6. Build and start the app
7. ngrok admin panel is available at <http://localhost:4040>
8. Set webhooks for telegram api
9. Done! You can start use bots
