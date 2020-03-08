import { Blocker } from "./blocker";
import { getSubdomain } from "../get-subdomain";
import {shittyShutterflyParse} from "../shitty-shutterfly-parse";
import { CHANNEL, QUERY, SAVE } from "../actions/import-tags";

const sub = getSubdomain();

chrome.runtime.onMessage.addListener((message) => {
    if (message.channel === CHANNEL && message.action === QUERY) {
        importTags();
    }
});

function importTags() {
    Blocker.show('importing tags');

    const tags = [];

    const tagIds = [...document.querySelectorAll('.tm-sitetags-list a')]
        .map(el => {
            const match = el.getAttribute('onclick').match(/"(\w\.\d+)"/);
            if (!match) {
                return false;
            }
            return match[1];
        })
        .filter(tag => !!tag);

    let i = 1;
    let total = tagIds.length;

    // serial ajax calls with a sleep time in between
    tagIds.reduce((chain, tag) => {
        return chain.then(() => {
            Blocker.detail(`loading data for tag #${i} of ${total}`);
            i++;
            return queryTag(tag)
                .then(data => tags.push(data))
                .then(() => new Promise((resolve) => {
                    setTimeout(resolve, 500)
                }));
        });
    }, Promise.resolve())
        .then(() => {
            Blocker.detail('sending data to the server');

            // send it through the extension for saving
            const saveMessage = {
                channel: CHANNEL,
                action: SAVE,
                tags
            };

            chrome.runtime.sendMessage(chrome.runtime.id, saveMessage, (rsp) => {
                // some error happened trying to send to the extension
                if (chrome.runtime.lastError) {
                    rsp = {
                        message: `Extension error: ${chrome.runtime.lastError.message}`,
                        success: false
                    }
                }

                alert(rsp.message);
                Blocker.hide();
            });
        });
}

function queryTag(tag) {
    const fd = new FormData();

    fd.append('tag', tag);
    fd.append('startIndex', '0');
    fd.append('size', '-1');
    fd.append('pageSize', '-1');
    fd.append('page', `${sub}/_/tags`);
    fd.append('nodeId', '3');
    fd.append('layout', 'ManagementTags');

    return fetch(`//cmd.shutterfly.com/commands/tagsmanagement/gettags?site=${sub}&`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
    })
        .then(rsp => rsp.text())
        .then(result => shittyShutterflyParse(result).result.section);
}