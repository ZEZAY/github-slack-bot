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

create `post` endpoint for github webhook, then add it to the target repository

there are 2 possible ways to add webhook to a repository:

1. go to target repo, Repo Settings > Code and automation > Webhooks
2. create github app, App Settings > General > Webhook

about events and payloads: [here!](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)
