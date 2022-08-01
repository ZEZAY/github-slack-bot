import { KnownBlock, MessageAttachment, Option } from '@slack/bolt';
import { findWorkflowsChanged, getTagBefore as findTagBefore, listWorkflow } from './github-workflow';
import { repo } from './server';
import { encodeDeployActionValue } from './utils/action-value';

export async function updatedAttachment(tag: string): Promise<[string, MessageAttachment[]]> {
    const title = ':mega:  New version available '.concat(tag)

    let workflows = await listWorkflow(tag);
    workflows.sort((a, b) => (a.path > b.path ? 1 : -1));

    const head = tag;
    const base = await findTagBefore(tag);
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
                    text: `*Repo:*  ${repo.name}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Tag:*  ${tag}`,
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