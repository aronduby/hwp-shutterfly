import { CHANNEL, SHOW, HIDE } from "../blocker.ext";

import '../../css/blocker.css';
import '../../img/loading.png';

export class Blocker {

    static show() {
        document.body.appendChild(this.el);
    }

    static hide() {
        this.el.remove();
    }

}

const el = document.createElement('div');
el.id = 'hwp-blocker';

const loading = document.createElement('img');
loading.src =  chrome.extension.getURL("loading.png");
el.appendChild(loading);

Blocker.el = el;

// Calls from the extension route through here
chrome.runtime.onMessage.addListener((message) => {
    if (message.channel === CHANNEL) {
        switch (message.action) {
            case SHOW:
                Blocker.show();
                break;

            case HIDE:
                Blocker.hide();
                break;
        }
    }
});