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
