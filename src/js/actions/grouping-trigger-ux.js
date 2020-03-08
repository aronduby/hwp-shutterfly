import {send} from '../messaging';

export const CHANNEL = 'groups';
export const OPEN = 'open';

export function triggerGroupingUx() {
    send({
        channel: CHANNEL,
        action: OPEN
    });
}