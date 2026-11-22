# Willow Salon booking agent

Booking agent for a small hair salon (NestJS + TypeScript, MongoDB, Claude). It can check
free slots, book, reschedule and cancel. Cancels need a yes from the customer before anything
is written.

## Run it

```bash
nvm use 26
npm install
cp .env.example .env
docker compose up -d mongo     # MongoDB 8 on port 27022
npm run build
npm run seed                   # 28 slots, 4 bookings
npm run start:prod             # http://localhost:3500
```

Requests are in `request.http` (VS Code REST Client).

## Live vs offline

`LLM_MODE=live` with `ANTHROPIC_API_KEY` set in `.env` calls Claude (`claude-opus-5-5`).
Every model response is also saved to `fixtures/`, keyed on the whole conversation.

`LLM_MODE=offline` replays those saved responses instead, so no key is needed. It only works
for a conversation that already ran live: the `fixtures/` here are from a run of the requests
in `request.http` on a fresh seed, and the replies say `"source": "recorded"`.

## Docker

```bash
docker compose up --build -d --wait   # mongo, one-shot seed job, agent on 3500
docker compose ps
docker compose down -v                # stop and drop the data
```
