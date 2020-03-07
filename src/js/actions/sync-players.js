import '../typedefs/sync-players';

import { Blocker } from "../blocker.ext";
import * as settings from '../settings';
import * as messaging from '../messaging';

let bgp = chrome.extension.getBackgroundPage();

/**
 * This lives in popup, but popup won't be open/listening so we need to export this out to the background.js file
 */
export function backgroundTasks() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'saveSyncData') {
            saveSyncData(message)
                .then((rsp) => {
                    sendResponse(rsp);
                });

            // have to return true to be able to respond async
            return true;
        }
    });
}

/**
 * Loads all of our player data from the site and then kicks off the content
 */
export function syncPlayers() {
    Blocker.show();

    let opts = {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Authorization': `Bearer ${bgp.auth.token}`
        }
    };

    fetch(`${settings.baseUrl}/shutterfly/players`, opts)
        .then((res) => res.json())
        .then(players => {
            let allPlayers = Object.values(players).reduce((all, group) => {
                group.forEach((playerSeason) => {
                    all[playerSeason.id] = playerSeason;
                });

                return all;
            }, {});

            // message content script so it can handle the UX and dom setup
            // later that UX will call back for saving
            messaging.send({
                action: 'syncPlayersUx',
                allPlayers
            });

            Blocker.hide();
        });
}

/**
 * Called from the content script with the data to sync back to the server
 *
 * @param {object} message
 * @param {PlayerFormData[]} message.saveData
 * @returns {Promise<{}>}
 */
export async function saveSyncData(message) {
    let opts = {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Authorization': `Bearer ${bgp.auth.token}`
        },
        body: JSON.stringify(message.saveData)
    };

    return fetch(`${settings.baseUrl}/shutterfly/sync`, opts)
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