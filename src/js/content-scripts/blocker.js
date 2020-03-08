import { CHANNEL, SHOW, HIDE } from "../blocker.ext";

import '../../css/blocker.css';
import '../../img/loading.png';

export class Blocker {

    static show(details) {
        document.body.appendChild(this.el);

        if (details) {
            this.detail(details);
        }
    }

    static hide() {
        this.el.remove();
        if (this.detailEl) {
            this.detailEl.remove();
        }
    }

    static detail(content) {
        if (!this.detailEl) {
            this.detailEl = document.createElement('aside');
            this.detailEl.id = 'hwp-blocker-detail';
            this.el.appendChild(this.detailEl);
        }

        this.detailEl.innerHTML = content;
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
                Blocker.show(message.data);
                break;

            case HIDE:
                Blocker.hide();
                break;
        }
    }
});