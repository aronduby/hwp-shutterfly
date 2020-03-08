import {getSubdomain} from "../get-subdomain";
import { CHANNEL, OPEN } from "../actions/grouping-trigger-ux";

import '../../css/hwp-popup.css';
import '../../css/hwp-table.css';
import '../../css/tagging-groups.css';

const reserved = ['a', 'n', 'p', 'z'];
const sub = getSubdomain();
const storageKey = `${sub}.tagging.groups`;

let groups = [];

chrome.runtime.onMessage.addListener((message) => {
    if (message.channel === CHANNEL  && message.action === OPEN) {
        chrome.storage.sync.get(storageKey, ({[storageKey]: items}) => {
            const groupMap = new Map(items);
            groups = [...groupMap.keys()];
            initUx(groupMap);
        });
    }
});

function initUx(groupMap) {
    // already setup
    if (document.querySelector('.hwp-root')) {
        return true;
    }

    let names = [...document.querySelectorAll('.roster-name')].map(el => el.textContent.trim());

    let groupsByName = [...groupMap.entries()].reduce((acc, [key, list]) => {
        list.forEach((name) => {
            (acc[name] ? acc[name] : acc[name] = []).push(key);
        });
        return acc;
    }, {});

    let content = `
        <article class="hwp-popup">
            <header class="hwp-popup-header">
                <h1>Manage Groups</h1>
                <p>Groups allow you to assign short cut keys to tag multiple people at once. Simply hot Alt + Your Letter to tag everyone in that group.</p>
                <button class="hwp-close">&times;</button>
            </header>
            <section class="hwp-groupAdmin">
                <form class="hwp-groupAddForm">
                    <fieldset>
                        <legend>Add a New Group</legend>
                        <input name="group" maxlength="1" pattern="[a-z]" placeholder="key">
                        <button>+</button>
                    </fieldset>
                </form>
                <ul class="hwp-groupList">
                    ${groups.map(g => createGroupListItem(g)).join('')}
                </ul>
            </section> 
            <section class="hwp-playerGroupAdmin">
                <form class="hwp-playerGroupAdminForm">
                    ${createPlayerTable(names, groups, groupsByName)}
                </form>
            </section>
        </article>
    `;

    let el = document.createElement('div');
    el.classList.add('hwp-root');
    el.innerHTML = content;
    document.body.appendChild(el);

    setupEvents();
}

/**
 * Setup (and tear down) events
 * @param {boolean} unbind - if we're actually removing/unbinding events
 */
function setupEvents(unbind = false) {
    let method = unbind ? removeEventListener : addEventListener;

    method.call(document.querySelector('.hwp-groupAddForm'), 'submit', addNewGroup);
    method.call(document.querySelector('.hwp-groupList'), 'click', removeGroup);
    method.call(document.querySelector('.hwp-playerGroupAdminForm'), 'submit', saveGroups);
    method.call(document.querySelector('.hwp-close'), 'click', removeUx);

}

/**
 * Handler for adding a new group
 *
 * @param {Event} e
 * @returns {boolean}
 */
function addNewGroup(e) {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(this);
    const g = fd.get('group').toLowerCase();

    // make sure it doesn't exist in groups already and it's not predefined
    if([...groups, ...reserved].includes(g)) {
        alert('That group key already exists or is a reserved key (a,n,p,z)');
        this.reset();
        return false;
    }

    // add to the group list
    document.querySelector('.hwp-groupList').innerHTML += createGroupListItem(g);

    // add to all of the player rows
    [...document.querySelectorAll('.hwp-player-table tbody tr')].forEach(tr => {
        let name = tr.querySelector('th').textContent;
        let input = createPlayerGroupInput(name, g, false);

        tr.querySelector('td').innerHTML += input;
    });

    groups.push(g);

    this.reset();
    return false;
}

/**
 * Delegation handler for removing existing groups
 *
 * @param {MouseEvent<button>} e
 */
function removeGroup(e) {
    if (e.target && e.target.nodeName === 'BUTTON') {
        e.preventDefault();
        e.stopPropagation();

        let g = e.target.value;
        let li = e.target.parentNode;

        li.parentNode.removeChild(li);

        let inputs = document.querySelectorAll(`label[data-g=${g}`);
        [...inputs].forEach((el) => {
            el.parentNode.removeChild(el);
        });

        let idx = groups.indexOf(g);
        groups.splice(idx, 1);
    }
}

/**
 * Saves all of the groupings into sync storage
 * @param e
 */
function saveGroups(e) {
    e.preventDefault();
    e.stopPropagation();

    const fd = new FormData(this);
    const entries = groups.reduce((acc, g) => {
        acc.push([g, fd.getAll(g)]);
        return acc;
    }, []);

    chrome.storage.sync.set({[storageKey]: entries}, function() {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            alert('Save errored, see console');
        } else {
            alert('Save success!');
        }

        removeUx();
    });
}

/**
 * Gets the list item for the top group admin list
 *
 * @param {string} g - the group key
 * @returns {string}
 */
function createGroupListItem(g) {
    return `<li>${g.toUpperCase()} <button value="${g}">-</button></li>`;
}

/**
 * Creates an individual input for a player and group
 *
 * @param {string} name - the player name
 * @param {string} g - the group key
 * @param {boolean} checked - if it should be checked
 * @returns {string}
 */
function createPlayerGroupInput(name, g, checked) {
    return `<label data-g="${g}"><input type="checkbox" name="${g}" value="${name}" ${checked ? 'checked' : ''} />${g.toUpperCase()}</label>`;
}

/**
 * Creates the markup for the players table
 *
 * @param {array<string>} names
 * @param {array<string>} groups
 * @param {array<string, array<string>>} groupsByName
 */
function createPlayerTable(names, groups, groupsByName) {
    let tableContent = '';

    let tableRows = names.map(name => {
        const belongsTo = groupsByName[name] || [];
        return `
            <tr>
                <th>${name}</th>
                <td>
                    ${groups.map(g => createPlayerGroupInput(name, g, belongsTo.includes(g))).join('')}
                </td>
            </tr>`
    });

    chunkArray(tableRows, Math.ceil(tableRows.length / 4)).forEach(chunk => {
        tableContent += `<tbody>${chunk.join('')}</tbody>`;
    });

    return `
        <table class="hwp-table hwp-player-table">
            ${tableContent}
        </table>
        <footer class="hwp-player-footer">
            <button id="hwp-submit">save</button>
        </footer>
    `;
}

/**
 * Remove the UX / Closes the popup
 */
function removeUx() {
    setupEvents(true);

    document.querySelector('.hwp-root').remove();
}

/**
 * Returns an array with arrays of the given size.
 *
 * @param myArray {Array} array to split
 * @param chunk_size {int} Size of every group
 */
function chunkArray(myArray, chunk_size){
    const arrayLength = myArray.length;
    const tempArray = [];

    for (let index = 0; index < arrayLength; index += chunk_size) {
        const myChunk = myArray.slice(index, index+chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}