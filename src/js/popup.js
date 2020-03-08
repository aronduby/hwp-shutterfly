import "../css/popup.css";

import {triggerGroupingUx} from "./actions/grouping-trigger-ux";
import {login, logToken} from "./actions/login";
import {getTabUrl} from "./get-tab-url";
import {syncPlayers} from "./actions/sync-players";
import {importTags} from "./actions/import-tags";

const bgp = chrome.extension.getBackgroundPage();

const actions = {
    triggerGroupingUx,
    login,
    logToken,
    syncPlayers,
    importTags
};

function updateButtonEnabledState (url, onlyUpdateThisBtn = false) {
    let btns = [];
    if (onlyUpdateThisBtn && onlyUpdateThisBtn.dataset.enable) {
        btns = [onlyUpdateThisBtn];
    } else {
        btns = [...document.querySelectorAll('button[data-enable]')];
    }

    let u = new URL(url);
    let path = u.pathname;

    btns.forEach((btn) => {
        let regex = new RegExp(btn.dataset.enable);
        let enable = regex.test(path);

        btn.disabled = !enable;
    })
}

function loginStateChange(loggedIn, {access_token} = {}) {
    document.body.classList.toggle('logged-in', loggedIn);
}


document.addEventListener('DOMContentLoaded', async function () {
    if (bgp.auth.token) {
        loginStateChange(true);
    }
    bgp.auth.addCallback(loginStateChange);

    let btns = document.querySelectorAll('button.action');
    for (let i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', actions[btns[i].dataset.action]);
    }

    let url = await getTabUrl();
    updateButtonEnabledState(url);
});

/**
 * When the tab is changed enable/disabled buttons
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        updateButtonEnabledState(tab.url);
    }
});