import { requireEnv } from "./utils/env";
import { MessageAttachment } from '@slack/bolt';
import { updatedAttachment, approveOrDenyAttachment, workflowStatusAttachment } from './message';

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

export async function postApproveOrDenyMessage(
    workflowId: string,
    ref: string,
    status: string,
    approver: string,
    requester: string,
): Promise<void> {
    const [title, attachment] = await approveOrDenyAttachment(workflowId, ref, status, approver, requester)
    await postMessage(title, attachment);
}

export async function postWorkflowStatusMessage(
    workflowId: string,
    runID: number,
    ref: string,
    create_time: string,
    duration: number,
    requester: string,
    status: string,
): Promise<void> {
    const [title, attachment] = await workflowStatusAttachment(
        workflowId,
        runID,
        ref,
        create_time,
        duration,
        requester,
        status,
    )
    await postMessage(title, attachment);
}

export async function deleteMessage(ts: string, channel: string): Promise<void> {
    const messageId = ts;
    const channelId = channel;
    await client.chat.delete({
        channel: channelId,
        ts: messageId,
    });
}