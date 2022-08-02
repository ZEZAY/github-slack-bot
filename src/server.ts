import express from "express"
import { requireEnv } from "./utils/env";
import { postMergePRMessage, postUpdateNotifyMessage } from "./slack-messaging";
import { receiver } from "./slack-server";

export const repo = {
    owner: requireEnv('GITHUB_REPO_OWNER'),
    name: requireEnv('GITHUB_REPO_NAME'),
};
export const targetRepo = {
    name: requireEnv('GITHUB_TARGET_REPO_NAME'),
};
export const app = express();

app.use(express.json())

app.get("/", (_req, res) => {
    return res.send("hello world");
});

// * listen to slack actions
app.use('/', receiver.router);

const ghRouter = express.Router();
ghRouter.use(express.json());
ghRouter.use(express.urlencoded({ extended: true }));

ghRouter.post("/payload", async (req, res) => {

    // * public new tag -> notify to slack
    // there will be 2 payloads
    // use the one that ref begin with `refs/tags/`
    const ref = req.body.ref;
    if (
        typeof ref === 'string' &&
        req.body.deleted !== true &&
        req.body.repository.name === repo.name
    ) {
        if (ref.startsWith('refs/tags/')) {
            const tag = ref.split('/')[2];
            // send notify to slack
            await postUpdateNotifyMessage(tag);
        }
    }

    // * create pr -> auto merge pr
    // auto merge the pr
    // when its name format as `Dev - deploy <something> <version>`
    const action = req.body.action;
    const number = req.body.number;
    const pr = req.body.pull_request;
    if (
        action === 'opened' &&
        typeof number === 'number' &&
        typeof pr != undefined
    ) {
        const regex = /Dev - deploy .* v/gm;
        const isRegex = regex.test(pr.title);
        if (pr.head.repo.name === targetRepo.name && isRegex) {
            // send notify to slack
            await postMergePRMessage(pr);
        }
    }
    return res.sendStatus(200)
});

app.use('/github', ghRouter);