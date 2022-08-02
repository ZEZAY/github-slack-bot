import { App, ExpressReceiver } from '@slack/bolt';
import { postApproveOrDenyMessage } from './slack-messaging';
import { decodeDeployActionValue } from './utils/action-value';
import { WorkflowStatus } from './utils/enums';
import { requireEnv } from "./utils/env";

export const receiver = new ExpressReceiver({
    signingSecret: requireEnv('SLACK_SIGNING_SECRET'),
});

export const boltApp = new App({
    token: requireEnv('SLACK_BOT_TOKEN'),
    receiver,
});

boltApp.action('execute', async ({ body, ack }) => {
    await ack();
    if (body.type === 'block_actions') {
        const action = body.actions[0];
        if (action.type === 'button' && body.message && body.channel) {
            const { workflowId, ref } = decodeDeployActionValue(action.value);
            const requester = body.user.id;
            await postApproveOrDenyMessage(workflowId, ref, WorkflowStatus.PENDING, '', requester)
        }
    }
});

boltApp.action('execute-all', async ({ body, ack }) => {
    await ack();
    if (body.type === 'block_actions') {
        const action = body.actions[0];
        if (action.type === 'multi_static_select' && body.message && body.channel) {
            action.selected_options.forEach(async (option) => {
                const { workflowId, ref } = decodeDeployActionValue(option.value);
                const requester = body.user.id;
                await postApproveOrDenyMessage(workflowId, ref, WorkflowStatus.PENDING, '', requester)
            });
        }
    }
});
