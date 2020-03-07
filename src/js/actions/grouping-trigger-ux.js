import {send} from '../messaging';

export function triggerGroupingUx() {
    send({action: "groups"});
}