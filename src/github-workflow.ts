import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import { components } from '@octokit/openapi-types';
import { repo } from './server';
import { requireEnv } from './utils/env';

const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
        appId: requireEnv('GITHUB_APP_ID'),
        privateKey: requireEnv('GITHUB_APP_PRIVATE_KEY'),
        installationId: requireEnv('GITHUB_APP_INSTALLATION_ID'),
    },
});

export async function listWorkflow(branchOrTag: string): Promise<components['schemas']['workflow'][]> {
    const allWorkflow = await octokit.rest.actions.listRepoWorkflows({
        owner: repo.owner,
        repo: repo.name,
        branch: branchOrTag,
        // Results per page (max 100), Default: 30
        per_page: 100,
    });
    return allWorkflow.data.workflows;
}

export async function findWorkflowsChanged(base: string, head: string): Promise<Array<{ name: string; path: string }>> {
    const workflows = await listWorkflow(head);
    const filesChanged = await getFilesChanged(base, head);

    const workflowsChanged = workflows.filter((v) => {
        const service = v.path
            .replace('.github/workflows/', '')
            .replace('.yml', '');

        const re = RegExp(service.replace('-', '[-\\/]'));
        const reSlamm = RegExp(
            service.replace('-', '\\/(cmd|config|domain\\/usecase)\\/'),
        );

        return filesChanged.find((w) => {
            return w.match(re) != undefined || w.match(reSlamm) != undefined;
        });
    });
    return workflowsChanged;
}

export async function getTagBefore(tag: string): Promise<string> {
    const result = await octokit.rest.repos.listTags({
        owner: repo.owner,
        repo: repo.name,
    });
    const tags = result.data.map((v) => v.name);
    const reverse = [...tags].reverse();

    const indexOf = reverse.findIndex((v) => v === tag);
    if (indexOf <= 0) {
        return tag;
    }
    return reverse[indexOf - 1];
}

export async function getFilesChanged(base: string, head: string): Promise<string[]> {
    const result = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: repo.owner,
        repo: repo.name,
        basehead: `${base}...${head}`,
    });
    return result.data.files?.map((v) => v.filename) ?? [];
}