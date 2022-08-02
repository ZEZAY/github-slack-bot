import { requireEnv } from './utils/env';

export const approvers: string[] = requireEnv('SLACK_APPROVER').split(',');

export async function checkPermission(userId: string): Promise<boolean> {
  return approvers.includes(userId)
}
