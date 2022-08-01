import { KnownBlock, MessageAttachment, Option } from '@slack/bolt';
import { repo } from './server';

export async function getUpdatedAttachment(tag: string): Promise<[string, MessageAttachment[]]> {
    const title = ':mega:  New version available '.concat(tag)
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
        // todo: display workflows to execute
    ]

    const attachments: MessageAttachment[] = [
        {
            color: '',
            blocks: blocks,
        },
    ];
    return [title, attachments];
}