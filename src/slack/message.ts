import { KnownBlock, MessageAttachment, Option } from '@slack/bolt';
import { findWorkflowsChanged, getTagBefore, listWorkflow, mergePR } from '../githubaction/workflow';
import { approvers } from './permission';
import { repo } from '../server';
import { encodeDeployActionValue } from '../githubaction/actionvalue';
import { WorkflowStatus } from '../githubaction/enums';

export async function updatedAttachment(tag: string): Promise<[string, MessageAttachment[]]> {
    const title = ':mega: New version available '.concat(tag)

    let workflows = await listWorkflow(tag);
    workflows.sort((a, b) => (a.path > b.path ? 1 : -1));

    const head = tag;
    const base = await getTagBefore(tag);
    const recentlyChanged = await findWorkflowsChanged(base, head);
    recentlyChanged.forEach((w) => {
        workflows = workflows.filter((workflow) => workflow.path !== w.path);
    });

    const blocks: KnownBlock[] = [
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Repo:* ${repo.name}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Tag:* ${tag}`,
                },
            ],
        },
        // display workflows to execute
        ...workflowsSection(tag, recentlyChanged),
        {
            type: 'divider',
        },
        workflowSelectSection(tag, workflows),
    ]

    const attachments: MessageAttachment[] = [
        {
            color: '',
            blocks: blocks,
        },
    ];
    return [title, attachments];
}

function workflowsSection(ref: string, workflows: Array<{ name: string; path: string }>): KnownBlock[] {
    const blocks: KnownBlock[] = workflows.map((w) => {
        const workflowId = w.path.split('/')[2];
        const text = '*'.concat(w.name, '*', '\n', workflowId);
        const requester = '';

        const block: KnownBlock = {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: text,
            },
            accessory: {
                type: 'button',
                text: {
                    type: 'plain_text',
                    emoji: true,
                    text: 'Execute',
                },
                action_id: 'execute',
                value: encodeDeployActionValue({ workflowId, ref, requester }),
            },
        };
        return block;
    });

    if (blocks.length > 0) {
        const header: KnownBlock[] = [
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*Recently changed:*',
                },
            }
        ]
        return header.concat(blocks)
    }
    return blocks;
}

function workflowSelectSection(
    ref: string,
    workflows: Array<{ name: string; path: string }>,
): KnownBlock {
    const optionBlocks: Option[] = workflows.map((w) => {
        const workflowId = w.path.split('/')[2];
        const text = w.name + ' | ' + workflowId;
        const requester = '';
        return {
            text: {
                type: 'plain_text',
                text: text,
                emoji: true,
            },
            value: encodeDeployActionValue({ workflowId, ref, requester }),
        };
    });

    const block: KnownBlock = {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: '*Choose workflow(s) to execute:*',
        },
        accessory: {
            type: 'multi_static_select',
            placeholder: {
                type: 'plain_text',
                text: 'Execute workflows',
                emoji: true,
            },
            options: optionBlocks,
            action_id: 'execute-all',
        },
    };
    return block;
}

export async function approveOrDenyAttachment(
    workflowId: string,
    ref: string,
    status: string,
    approver: string,
    requester: string,
): Promise<[string, MessageAttachment[]]> {
    let title;
    let textStatus;
    let textStatus_val;
    switch (status) {
        case WorkflowStatus.PENDING:
            title = ':rocket: You have a new request:\n';
            for (const ap of approvers) {
                title = title.concat('<@', ap, '>');
            }
            textStatus = 'Status';
            textStatus_val = WorkflowStatus.PENDING;
            break;
        case WorkflowStatus.DENY:
            title = 'Approval: :no_entry: '.concat(workflowId, ' has been ', status);
            textStatus = 'Denied by';
            textStatus_val = '<@'.concat(approver, '>');
            break;
        default:
            title = 'Approval: :ok: '.concat(workflowId, ' has been ', status);
            textStatus = 'Approved by';
            textStatus_val = '<@'.concat(approver, '>');
    }
    const blocks: KnownBlock[] = [
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Workflow:*\n${workflowId}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Branch:*\n${ref}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*${textStatus} :*\n${textStatus_val}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Requested by:*\n<@${requester}>`,
                },
            ],
        },
    ];

    if (status == WorkflowStatus.PENDING) {
        blocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        emoji: true,
                        text: 'Approve',
                    },
                    action_id: 'approve',
                    style: 'primary',
                    value: encodeDeployActionValue({
                        workflowId,
                        ref,
                        requester,
                    }),
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        emoji: true,
                        text: 'Deny',
                    },
                    action_id: 'deny',
                    style: 'danger',
                    value: encodeDeployActionValue({
                        workflowId,
                        ref,
                        requester,
                    }),
                },
            ],
        });
    }

    const attachment: MessageAttachment[] = [
        {
            color: '',
            blocks: blocks,
        },
    ];
    return [title, attachment];
}

export async function workflowStatusAttachment(
    workflowId: string,
    runID: number,
    ref: string,
    create_time: string,
    duration: number,
    requester: string,
    status: string,
    // workflow_message_channel: string,
    // workflow_message_ts: string,
): Promise<[string, MessageAttachment[]]> {
    let title: string;
    let color: string;
    switch (status) {
        case WorkflowStatus.SUCCESS:
            title = 'Status: :white_check_mark: Success';
            color = '#2ECC71';
            break;
        case WorkflowStatus.FAILURE:
            title = 'Status: :x: Failure';
            color = '#ff3838';
            break;
        case WorkflowStatus.QUEUE:
            title = 'Status: Queued';
            color = '#1E90FF ';
            break;
        case WorkflowStatus.IN_PROGRESS:
            title = 'Status: In progress';
            color = '#1E90FF ';
            break;
        default:
            title = 'Status: :warning: '.concat(status);
            color = '#f2c744';
    }

    const blocks: KnownBlock[] = [
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Workflow:*\n${workflowId}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Branch:*\n${ref}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Create Time:*\n${create_time}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Duration:*\n${duration} sec`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Status:*\n${status}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Request by:*\n<@${requester}>`,
                },
            ],
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Click to view build log',
                        emoji: true,
                    },
                    value: `${runID}`,
                    url: `https://github.com/${repo.owner}/${repo.name}/actions/runs/${runID}`,
                    action_id: 'check-workflow-run',
                },
            ],
        },
    ];

    const attachment: MessageAttachment[] = [
        {
            color: color,
            blocks: blocks,
        },
    ];
    return [title, attachment];
}

export async function mergePRAttachment(
    pr: any,
): Promise<[string, MessageAttachment[]]> {
    const [result, status] = await mergePR(pr.number);
    let title: string;
    if (status == 200) {
        title = 'Merge: :tada: Success\n'.concat(result.message);
    } else {
        title = 'Merge: :construction: Failure '.concat(
            '(',
            status,
            ')\n',
            result.message,
        );
    }

    const blocks: KnownBlock[] = [
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Title:*\n${pr.title}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Number:*\n${pr.number}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Head:*\n${pr.head.ref}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Base:*\n${pr.base.ref}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Create Time:*\n${pr.created_at}`,
                },
            ],
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Click to view pull request',
                        emoji: true,
                    },
                    value: `${pr.number}`,
                    url: pr.html_url,
                    action_id: 'check-pull-request',
                },
            ],
        },
    ];
    const attachment: MessageAttachment[] = [
        {
            color: '#9647b3',
            blocks: blocks,
        },
    ];
    return [title, attachment];
}