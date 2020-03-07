import * as messaging from './messaging';

export class Blocker {

    static show() {
        send(SHOW);
    }

    static hide() {
        send(HIDE);
    }

}

function send(action) {
    messaging.send({
        channel: CHANNEL,
        action
    })
}

export const CHANNEL = 'Blocker';
export const SHOW = 'show';
export const HIDE = 'hide';