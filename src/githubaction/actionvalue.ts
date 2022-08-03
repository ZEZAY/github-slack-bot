export const ACTION_VALUE_DELIMITER = '::';

export interface DeployActionValue {
    workflowId: string;
    ref: string;
    requester: string;
}

export interface RequestActionValue {
    workflowId: string;
    ref: string;
    requester: string;
    workflow_message_channel: string;
    workflow_message_ts: string;
}

export function encodeDeployActionValue({
    workflowId,
    ref,
    requester,
}: DeployActionValue): string {
    return [workflowId, ref, requester].join(ACTION_VALUE_DELIMITER);
}

export function decodeDeployActionValue(value: string): DeployActionValue {
    const [workflowId, ref, requester] = value.split(ACTION_VALUE_DELIMITER);
    return {
        workflowId,
        ref,
        requester,
    };
}

export function encodeRequestActionValue({
    workflowId,
    ref,
    requester,
    workflow_message_channel,
    workflow_message_ts,
}: RequestActionValue): string {
    return [
        workflowId,
        ref,
        requester,
        workflow_message_channel,
        workflow_message_ts,
    ].join(ACTION_VALUE_DELIMITER);
}

export function decodeRequestActionValue(value: string): RequestActionValue {
    const [
        workflowId,
        ref,
        requester,
        workflow_message_channel,
        workflow_message_ts,
    ] = value.split(ACTION_VALUE_DELIMITER);
    return {
        workflowId,
        ref,
        requester,
        workflow_message_channel,
        workflow_message_ts,
    };
}
