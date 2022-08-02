import { requireEnv } from './utils/env';

export const approvers: string[] = requireEnv('SLACK_APPROVER').split(',');

export async function checkPermission(userId: string): Promise<boolean> {
  if (!approvers.includes(userId)) {
    return false;
  }
  return true;
}
