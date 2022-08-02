import { App, ExpressReceiver } from '@slack/bolt';
import { checkWorkflowStatus, deployWorkflow, getLatestRunIdFor } from './github-workflow';
import { checkPermission } from './permission';
import { deleteMessage, postApproveOrDenyMessage, postWorkflowStatusMessage } from './slack-messaging';
import { decodeDeployActionValue, decodeRequestActionValue } from './utils/action-value';
import { delay } from './utils/async';
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

boltApp.action('approve', async ({ body, ack, say }) => {
    await ack();
    if (body.type !== 'block_actions') return;

    const action = body.actions[0];
    if (action.type !== 'button') return;

    const approver = body.user.id;
    const p = await checkPermission(approver);
    if (!p) {
        await say(`<@${approver}>, You need permission`);
        return;
    }

    try {
        // delete pending message
        if (body.message && body.channel) {
            await deleteMessage(body.message.ts, body.channel.id);
        }

        const { workflowId, ref, requester } = decodeRequestActionValue(action.value);
        await postApproveOrDenyMessage(workflowId, ref, WorkflowStatus.APPROVE, approver, requester)

        // deploy
        await deployWorkflow(workflowId, ref);

        let status: any = '';
        let conclusion: any;
        let prevStatus: any = '';
        let message: any = '';
        let create_at;
        let update_at;

        const runId = await getLatestRunIdFor(workflowId, ref);

        while (status != WorkflowStatus.COMPLETE) {
            [status, conclusion, create_at, update_at] = await checkWorkflowStatus(runId);
            const duration = (new Date(update_at).getTime() - new Date(create_at).getTime()) / 1000;

            if (prevStatus != status) {
                if (message != '') {
                    await deleteMessage(message.ts, message.channel);
                }
                await postWorkflowStatusMessage(
                    workflowId,
                    runId,
                    ref,
                    create_at,
                    duration,
                    requester,
                    (status == WorkflowStatus.COMPLETE) ? conclusion : status,
                );
            }
            prevStatus = status;
            await delay(1000);
        }
    } catch (error) {
        console.log(error);
        await say('Deploy Error, please try again later or contact admins.');
    }
});

boltApp.action('deny', async ({ body, ack }) => {
    await ack();
    if (body.type !== 'block_actions') return;

    const action = body.actions[0];
    if (action.type !== 'button') return;

    if (body.message && body.channel) {
        await deleteMessage(body.message.ts, body.channel.id);
    }

    const { workflowId, ref, requester } = decodeDeployActionValue(action.value);
    const denier = body.user.id;
    await postApproveOrDenyMessage(workflowId, ref, WorkflowStatus.DENY, denier, requester)
});

boltApp.action('check-workflow-run', async ({ ack }) => {
    await ack();
});

boltApp.action('check-pull-request', async ({ ack }) => {
    await ack();
});