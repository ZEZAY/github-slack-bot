# Dev

## Setup

```bash
# typescript
npx tsc --init

# yarn
yarn init
yarn add ts-node-dev typescript -D
yarn add express
yarn add @types/node @types/express -D
```

app.ts

```ts
import express from "express";

export const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res.send("hello world");
});

app.post("api/data", (req, res) => {
  console.log(req.body);
  return res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("app is running");
});
```

## Github Webhooks

to listen to events happen to a repository

- create `post` endpoint for github webhook, then add it to the target repository

- there are 2 possible ways to add webhook to a repository:

  1. go to target repo, Repo Settings > Code and automation > Webhooks
  2. create github app, App Settings > General > Webhook

> docs for github events and payloads: [here!](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)

## Slack App

to send notify messages

- there are many ways to send messages: [here!](https://api.slack.com/messaging/sending#sending_methods)

> docs for message management: [here!](https://api.slack.com/messaging)

to react to slack actions using `@slack/bolt` lib

- create `post` endpoint for slack webhook
- add it to slack app, App Features > Interactivity & Shortcuts > Interactivity > Request URL

> docs for boltApp starter: [here!](https://slack.dev/bolt-js/tutorial/getting-started-http#setting-up-your-project)

## Github App

to take action with github repository/workflows using `@octokit` lib

> docs for octokit/rest: [here!](https://octokit.github.io/rest.js/)
