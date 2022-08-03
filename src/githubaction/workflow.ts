import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import { components } from '@octokit/openapi-types';
import { repo, targetRepo } from '../server';
import { requireEnv } from '../utils/env';
import { delay } from '../utils/async';

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

export async function getLatestRunIdFor(workflowId: string, branchOrTag: string): Promise<number> {
    for (let i = 0; i < 100; i++) {
        const result = await octokit.rest.actions.listWorkflowRuns({
            owner: repo.owner,
            repo: repo.name,
            workflow_id: workflowId,
            branch: branchOrTag,
        });
        const workflowRuns = result.data.workflow_runs;

        if (workflowRuns.length === 0 || workflowRuns[0].status === 'completed') {
            await delay(200);
            continue;
        }

        const latestRun = workflowRuns[0];
        return latestRun.id;
    }
    // timeout
    throw new Error(`no recently run for ${workflowId} ${branchOrTag}`);
}

export async function checkWorkflowStatus(runId: number): Promise<any> {
    const result = await octokit.rest.actions.getWorkflowRun({
        owner: repo.owner,
        repo: repo.name,
        run_id: runId,
    });

    const run = result.data;
    return [run.status, run.conclusion, run.created_at, run.updated_at];
}

export async function deployWorkflow(workflowId: string, branchOrTag: string): Promise<number> {
    const result = await octokit.rest.actions.createWorkflowDispatch({
        owner: repo.owner,
        repo: repo.name,
        workflow_id: workflowId,
        ref: branchOrTag,
    });
    return result.status;
}

export async function mergePR(pullNumber: number): Promise<any> {
    try {
        const result = await octokit.rest.pulls.merge({
            owner: repo.owner,
            repo: targetRepo.name,
            pull_number: pullNumber,
        });
        return [result.data, result.status];
    } catch (err) {
        console.log(err);
        // data -> err msg
        // status -> not 200
        return [err, 0];
    }
}