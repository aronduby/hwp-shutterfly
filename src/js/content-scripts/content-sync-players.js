import '../typedefs/sync-players';

import {getSubdomain} from "../get-subdomain";
import {shittyShutterflyParse} from "../shitty-shutterfly-parse";
import {Blocker} from "./blocker";

import '../../css/hwp-popup.css';
import '../../css/hwp-table.css';
import '../../css/content-sync-players.css';

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'syncPlayersUx') {
        initUx(message.allPlayers);
    }
});

const IMPORT = '__IMPORT__';
const SKIP = '__SKIP__';
const REMOVE = '__REMOVE__';
const TAG_ACTIONS = [IMPORT, SKIP, REMOVE];

const sub = getSubdomain();

/**
 *
 * @param {array<PlayerSeason>} allPlayers
 */
function initUx(allPlayers) {
    // already setup
    if (document.querySelector('.hwp-root')) {
        return true;
    }

    let rosterPlayers = getRosterPlayers();
    let playerStates = getPlayerStates(rosterPlayers, allPlayers);

    let content = `
        <article class="hwp-popup playerSync"> 
            <header class="hwp-popup-header">
                <h1>Sync Players</h1>
                <button class="hwp-close">&times;</button>
            </header>
            <form class="hwp-playerSync-form">
                <section class="hwp-playerSync-section hwp-playerSync-section--unmatched">
                    <h2>Players to Import</h2>
                    <table class="hwp-table">
                        <thead>
                            <tr>
                                <th>Player</th><th>Shutterfly</th><th>Save?</th>
                            </tr>
                        </thead>
                        <tbody data-empty-msg="There are no players that need to be imported">${createUnmatchedRows(playerStates.unmatched, rosterPlayers)}</tbody>
                    </table>
                </section>
                <section class="hwp-playerSync-section hwp-playerSync-section--nameMatched">
                    <h2>Players Matched By Name</h2>
                    <table class="hwp-table">
                        <thead>
                            <tr>
                                <th>Player</th><th>Shutterfly</th><th>Save?</th>
                            </tr>
                        </thead>
                        <tbody data-empty-msg="There are no players that matched by name">${createNameMatchedRows(playerStates.nameMatched, rosterPlayers)}</tbody>
                    </table>
                </section>
                <section class="hwp-playerSync-section hwp-playerSync-section--tagMatched">
                    <h2>Already Synced</h2>
                    <table class="hwp-table">
                        <thead>
                            <tr>
                                <th>Player</th><th>Shutterfly</th><th>Save?</th>
                            </tr>
                        </thead>
                        <tbody data-empty-msg="There are no players that are already synced">${createTagMatchedRows(playerStates.tagMatched, rosterPlayers)}</tbody>
                    </table>
                </section>
                <footer class="hwp-playerSync-footer">
                    <button id="hwp-submit">save</button>
                </footer>
            </form>            
        </article>
    `;

    let el = document.createElement('div');
    el.classList.add('hwp-root');
    el.innerHTML = content;
    document.body.appendChild(el);

    setupEvents();
}

/**
 * Remove the UX / Closes the popup
 */
function removeUx() {
    setupEvents(true);
    document.querySelector('.hwp-root').remove();
}

/**
 * Setup (and tear down) events
 * @param unbind {boolean} are we actually removing listeners?
 */
function setupEvents(unbind = false) {
    const method = unbind ? removeEventListener : addEventListener;
    const form = document.querySelector('.hwp-playerSync-form');

    method.call(form, 'change', formElementChanged);
    method.call(form, 'submit', playerSyncSubmitted);
    method.call(document.querySelector('.hwp-close'), 'click', removeUx);
}

/**
 *
 * DOM Events
 *
 */

/**
 * When the selects are changed
 * @param e
 */
function formElementChanged(e) {
    // roster/tag select changes
    if (e.target.tagName === 'SELECT' && e.target.classList.contains('hwp-roster-player')) {
        const val = e.target.value;
        const cb = e.target.closest('tr').querySelector('input[type=checkbox]');

        // noinspection EqualityComparisonWithCoercionJS
        cb.checked = val !== SKIP && (
            val !== e.target.dataset.originalValue
            || cb.dataset.originallyChecked == true
        );

        checkValidationState(e.target);
    }

    // checkbox changes
    if (e.target.type === 'checkbox') {
        checkValidationState(e.target);
    }
}

/**
 * Form has been submitted
 *
 * @param e
 * @returns {Promise<boolean>}
 */
async function playerSyncSubmitted(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    Blocker.show('saving data');

    const saveData = parseDataFromRows([...e.target.querySelectorAll('.hwp-playerSync-section tbody tr')]);

    if (!validateSaveData(saveData)) {
        Blocker.hide();
        return false;
    }

    const toImport = saveData.filter(d => d.tagId === IMPORT);

    try {
        await importPlayersToShutterfly(toImport);

        let newRoster = await loadShutterflyRoster();
        updateTagsByPlayerName(toImport, newRoster);

        // send it through the extension for saving
        const saveMessage = {
            action: "saveSyncData",
            saveData
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
            if (rsp.success) {
                removeUx();
            }
        });

    } catch (err) {
        console.error(err);
        alert(`Something went wrong in the saving process. Please refresh the page and try again later.`);
        Blocker.hide();
    }
}

/**
 *
 * @param {PlayerFormData[]} saveData
 * @returns {boolean}
 */
function validateSaveData(saveData) {
    let duplicateTags = saveData.reduce((acc, d) => {
        // if its any action do nothing, those can have multiple
        if (TAG_ACTIONS.includes(d.tagId)) {
            return acc;
        }

        (
            acc.hasOwnProperty(d.tagId) ?
                acc[d.tagId]
                : acc[d.tagId] = []
        )
            .push(d);

        return acc;
    }, {});

    duplicateTags = Object.values(duplicateTags)
        .filter(arr => arr.length > 1);

    if (duplicateTags.length) {
        duplicateTags.forEach(dups => {
            const pids = dups.map(d => d.playerSeasonId);
            const pidsStr = JSON.stringify(pids);
            const selector = pids.map(pid => `tr[data-player-season-id="${pid}"]`).join(',');

            [...document.querySelectorAll(selector)]
                .forEach(el => el.dataset.duplicateTags = pidsStr);
        });

        alert('You have more than one player specified for a single tag. Please fix that and try again.');
        return false;
    }

    return true;
}

/**
 * Checks the row for duplicate validation errors and clears if applicable
 * @param {HTMLSelectElement|HTMLInputElement} el
 */
function checkValidationState(el) {
    const tr = el.closest('tr[data-duplicate-tags]');
    if (tr) {
        /**
         *  @type int[] playerSeasonId
         */
        const dupIds = JSON.parse(tr.dataset.duplicateTags);
        /**
         * @type {HTMLTableRowElement[]}
         */
        const dupRows = getPlayerRowsByIds(dupIds);
        /**
         * @type {PlayerFormData[]}
         */
        const dupData = parseDataFromRows(dupRows, false); //get all of the rows in case they fix the dup by not saving

        /**
         * @type {Object.<string, PlayerFormData[]>} tagId is key
         */
        const groupedDupData = dupData.reduce((acc, d) => {
            (
                acc.hasOwnProperty(d.tagId) ?
                    acc[d.tagId]
                    : acc[d.tagId] = []
            )
                .push(d);

            return acc;
        }, {});

        // create an array of no longer duplicated items
        // but don't just filter because we want to remove them from the duped ids
        const noLongerDupIds = Object.values(groupedDupData).reduce((acc, dups) => {
            let newNonDupIds = [];

            // if they aren't set to save they automatically go to not duplicates
            const saveState = dups.reduce((states, data) => {
                states[data.save ? 'save' : 'skip'].push(data);
                return states;
            }, {save: [], skip: []});

            newNonDupIds = newNonDupIds.concat(saveState.skip.map(d => d.playerSeasonId));

            if (saveState.save.length === 1) {
                newNonDupIds.push(saveState.save[0].playerSeasonId);
            }

            newNonDupIds.forEach(pid => {
                let idx = dupIds.indexOf(pid);
                dupIds.splice(idx, 1);
                acc.push(pid);
            });

            return acc;
        }, []);

        // remove the data attribute from the no longer duplicated rows
        noLongerDupIds.forEach(pid => {
            delete document.querySelector(`tr[data-player-season-id="${pid}"]`).dataset.duplicateTags;
        });

        // update all of the still duplicate rows with the new ids
        if (dupIds.length) {
            const newDupIdsJson = JSON.stringify(dupIds);
            getPlayerRowsByIds(dupIds).forEach(tr => {
                tr.dataset.duplicateTags = newDupIdsJson;
            });
        }
    }
}


/**
 *
 * Data Handling
 *
 */

/**
 * This imports the given data into the Shutterfly roster.
 * Note that the response body from this request is empty
 *
 * @param playersToImport
 * @returns {Promise}
 */
async function importPlayersToShutterfly(playersToImport) {
    let i = 0;
    function getRosterObject({firstName, lastName}) {
        let obj = {
            firstName,
            lastName,
            "email": "",
            "parent1": {
                "email": "",
                "name": ""
            },
            "parent2": {
                "email": "",
                "name": ""
            },
            "phone": "",
            "row": i
        };

        i++;
        return obj;
    }

    const rosterImportObjects = playersToImport.map(p => getRosterObject(p));
    const rosterImportJson = JSON.stringify(rosterImportObjects);

    const fd  = new FormData();
    fd.append('data', rosterImportJson);

    return fetch(`//cmd.shutterfly.com/commands/siteroster/addbatch?site=${sub}&`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
    });
}

/**
 * Uses the shutterfly API to load all of the roster data
 *
 * @returns {Promise<RosterData[]>}
 */
async function loadShutterflyRoster() {
    const nodeId = document.querySelector('.section.mod-SiteRoster').attributes['s:menuargs'].value;

    const fd = new FormData();
    fd.append('layout', 'ListByFirstName');
    fd.append('page', `${sub}/roster`);
    fd.append('format', 'js');
    fd.append('nodeId', nodeId);

    // this returns the shitty js, not json :sob:
    // and not all players will have a tag id, but it appears to be localId or storageId prefixed with r.
    // noinspection JSValidateTypes
    return fetch(`//cmd.shutterfly.com/commands/siteroster/get?site=${sub}&`, {
        method: 'POST',
        body: fd,
        credentials: 'include'
    })
        .then(rsp => {
            return rsp.text();
        })
        .then((result) => {
            // noinspection JSUnresolvedFunction,JSUnresolvedVariable
            return shittyShutterflyParse(result).result.section.items;
        });
}

/**
 * In place update of target to set tagId from src based on name matching
 *
 * @param {PlayerFormData[]} target
 * @param {RosterData[]} src
 */
function updateTagsByPlayerName(target, src) {
    let srcByName = src.reduce((acc, r) => {
        acc[`${r.firstName} ${r.lastName}`] = r;
        return acc;
    }, {});

    // update the toImport data with the new tag info
    target.forEach((p) => {
        let srcEntry = srcByName[`${p.firstName} ${p.lastName}`];
        // new entries don't have tags yet, but tags are based off storageId or localId (they seem to always be the same)
        p.tagId = `r.${srcEntry.storageId}`;
    });
}

/**
 * Get the player data from the roster page DOM
 *
 * @returns {*} dictionary of tags r.# to player name
 */
function getRosterPlayers() {
    return [...document.querySelectorAll('.roster-name a')].reduce((acc, el) => {
        let tagId = el.href.substr(el.href.lastIndexOf('/') + 1);
        acc[`r.${tagId}`] = el.textContent;
        return acc;
    }, {});
}

/**
 * Organizes all players into the different state of matched/imported
 * @param rosterPlayers
 * @param allPlayers
 * @returns {object.<'unmatched'|'nameMatched'|'tagMatched', array<PlayerSeason>>}
 */
function getPlayerStates(rosterPlayers, allPlayers) {
    const rosterNames = Object.values(rosterPlayers);

    const playerStates = Object.values(allPlayers).reduce((states, player) => {
        if (player.shutterfly_tag && rosterPlayers.hasOwnProperty(player.shutterfly_tag)) {
            states.tagMatched.push(player);
            return states;
        }

        if (rosterNames.includes(`${player.player.first_name} ${player.player.last_name}`)) {
            states.nameMatched.push(player);
            return states;
        }

        states.unmatched.push(player);
        return states;
    }, {
        tagMatched: [],
        nameMatched: [],
        unmatched: []
    });

    // alpha the lists
    Object.keys(playerStates).forEach((k) => {
        playerStates[k].sort(function(a, b) {
            return a.player.name_key.localeCompare(b.player.name_key);
        });
    });

    return playerStates;
}


/**
 *
 * UX Generation Methods
 *
 */

/**
 * Creates the table rows for unmatched players
 *
 * @param players {array<PlayerSeason>}
 * @param rosterPlayers {object<string, string>}
 * @returns {string}
 */
function createUnmatchedRows(players, rosterPlayers) {
    const additional = [
        [IMPORT, 'Import New'],
        [SKIP, 'Skip']
    ];

    return players.map(player => {
        return `
            <tr data-player-season-id="${player.id}">
                <th>${createNameCellContent(player)}</th>
                <td>${createRosterPlayerSelect(`tagId`, rosterPlayers, IMPORT, additional)}</td>
                <td>${createSaveCheckbox(true)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Creates the table rows for name matched players
 *
 * @param players {array<PlayerSeason>}
 * @param rosterPlayers {object<string, string>}
 * @returns {string}
 */
function createNameMatchedRows(players, rosterPlayers) {
    const additional = [
        [IMPORT, 'Import New'],
        [SKIP, 'Skip']
    ];

    let rosterPlayersByName = Object.keys(rosterPlayers).reduce((acc, tag) => {
        acc[rosterPlayers[tag]] = tag;
        return acc;
    }, {});

    return players.map(player => {
        return `
            <tr data-player-season-id="${player.id}">
                <th>${createNameCellContent(player)}</th>
                <td>${createRosterPlayerSelect(`tagId`, rosterPlayers, rosterPlayersByName[`${player.player.first_name} ${player.player.last_name}`], additional)}</td>
                <td>${createSaveCheckbox(true)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Creates the table rows for name matched players
 *
 * @param players {array<PlayerSeason>}
 * @param rosterPlayers {object<string, string>}
 * @returns {string}
 */
function createTagMatchedRows(players, rosterPlayers) {
    const additional = [
        [REMOVE, 'Remove Tag']
    ];

    return players.map(player => {
        return `
            <tr data-player-season-id="${player.id}">
                <th>${createNameCellContent(player)}</th>
                <td>${createRosterPlayerSelect(`tagId`, rosterPlayers, player.shutterfly_tag, additional)}</td>
                <td>${createSaveCheckbox(false)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Creates the hidden inputs and name for the name cell in the player rows
 *
 * @param {PlayerSeason} player
 * @returns {string}
 */
function createNameCellContent(player) {
    return `
        <input type="hidden" name="playerSeasonId" value="${player.id}">
        <input type="hidden" name="firstName" value="${player.player.first_name}">
        <input type="hidden" name="lastName" value="${player.player.last_name}">
        ${player.player.first_name} ${player.player.last_name}
    `;
}

/**
 * Creates a select element for the passed in roster players
 *
 * @param name {string} The name for the input
 * @param rosterPlayers {object<string, string>} Dictionary of shutterfly tags to player name
 * @param selected {null|string} the value/tag to consider selected
 * @param additionalActions {array<array<string, string>>} Tuples of <val, text> to include as additional actions
 * @returns {string}
 */
function createRosterPlayerSelect(name, rosterPlayers, selected = null, additionalActions = []) {
    let additionalStr;
    if (additionalActions) {
        additionalStr = additionalActions.map(([val, text]) => {
            return `<option value="${val}" ${selected===val ? 'selected' : ''}>${text}</option>`
        }).join('');
    }

    return `<select class="hwp-roster-player" name=${name} data-original-value="${selected}">
        ${additionalStr ? `<optgroup label="Actions">${additionalStr}</optgroup>` : ``}
        <optgroup label="Roster">
            ${Object.keys(rosterPlayers).map((tag) => `<option value="${tag}" ${tag===selected ? `selected` : ``}>${rosterPlayers[tag]}</option>`).join('')}
        </optgroup>
    </select>`;
}

/**
 * Creates the checkbox input for the player row
 * @param {boolean} checked - checked to start?
 * @returns {string}
 */
function createSaveCheckbox(checked) {
    return `<input type="checkbox" name="save" data-originally-checked="${checked === true ? `1` : `0`}" ${checked === true ? 'checked' : ''} />`;
}

/**
 *
 * Util Methods
 *
 */

/**
 * Gets an array of tr rows for the given ids
 *
 * @param {array<int>} ids
 * @returns {HTMLTableRowElement[]}
 */
function getPlayerRowsByIds(ids) {
    if (!ids.length) {
        return [];
    }

    return [...document.querySelectorAll(
        ids.map(id => `tr[data-player-season-id="${id}"]`).join(',')
    )];
}

/**
 * Parses all of the items to save from the dom of the passed in element
 *
 * @param {HTMLTableRowElement[]} rows - array of tr elements with the data to parse
 * @param {boolean} onlyRowsMarkedForSave - true to only include rows that are marked to be saved, false to include everything
 * @returns {PlayerFormData[]}
 */
function parseDataFromRows(rows, onlyRowsMarkedForSave = true) {
    return rows.reduce((save, tr) => {
        if (!onlyRowsMarkedForSave || tr.querySelector('input[type=checkbox]').checked) {
            let data = [...tr.querySelectorAll('input, select')].reduce((obj, el) => {
                obj[el.name] = el.type === 'checkbox' ? el.checked : el.value;
                return obj;
            }, {});

            save.push(data);
        }

        return save;
    }, []);
}