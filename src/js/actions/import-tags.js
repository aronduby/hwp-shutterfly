import * as messaging from '../messaging';
import * as settings from "../settings";

export const CHANNEL = 'import-tags';
export const QUERY = 'query';
export const SAVE = 'save';

export function backgroundTasks() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.channel === CHANNEL && message.action === SAVE) {
            postTagsToServer(message.tags)
                .then((rsp) => {
                    sendResponse(rsp);
                });

            // have to return true to be able to respond async
            return true;
        }
    });
}

/**
 * Gathers all of the tags and tag data and then ships them off to the server
 */
export function importTags() {
    messaging.send({
        channel: CHANNEL,
        action: QUERY
    });
}

/**
 * Gets the data from the content script and posts it to the server
 *
 * @param tags
 * @returns {Promise<{}>}
 */
async function postTagsToServer(tags) {
    const bgp = chrome.extension.getBackgroundPage();

    let opts = {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Authorization': `Bearer ${bgp.auth.token}`
        },
        body: JSON.stringify(tags)
    };

    return fetch(`${settings.baseUrl}/shutterfly/saveTags`, opts)
        .then(rsp => {
            if (!rsp.ok) {
                console.error(rsp);
                throw new Error(`Network response error: ${rsp.status} - ${rsp.statusText}`);
            }

            return rsp.json();
        })
        .catch(err => {
            return {
                success: false,
                message: err.message,
                err
            };
        });
}