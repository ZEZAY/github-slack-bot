import { requireEnv } from "./utils/env";
import { MessageAttachment } from '@slack/bolt';
import { updatedAttachment } from './message';

const { WebClient, LogLevel } = require("@slack/web-api");
const client = new WebClient(requireEnv('SLACK_BOT_TOKEN'), {
    logLevel: LogLevel.DEBUG
});

export async function postMessage(title: string, attachments: MessageAttachment[]): Promise<void> {
    await client.chat.postMessage({
        channel: requireEnv('SLACK_CHANNEL'),
        text: title,
        attachments: attachments
    });
}

export async function postUpdateNotifyMessage(tag: string): Promise<void> {
    const [title, attachment] = await updatedAttachment(tag)
    await postMessage(title, attachment);
}
