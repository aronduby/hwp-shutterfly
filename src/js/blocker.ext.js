import * as messaging from './messaging';

export class Blocker {

    static show(detail) {
        send(SHOW, detail);
    }

    static hide() {
        send(HIDE);
    }

    static detail() {
        send(DETAIL);
    }

}

function send(action, data) {
    messaging.send({
        channel: CHANNEL,
        action,
        data
    })
}

export const CHANNEL = 'Blocker';
export const SHOW = 'show';
export const HIDE = 'hide';
export const DETAIL = 'detail';