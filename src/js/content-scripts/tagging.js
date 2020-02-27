/**
 *  Makes tagging photos suck a little bit less
 *  Removes the overlay blocking good view of the photo, adds keyboard shortcuts.
 *
 *  Run this after opening a photo for tagging.
 *
 *  You'll need the output from `tagging -- assign teams` for the team based options to work
 *  Copy/paste the output from that script in the area marked below
 *
 *  Shortcuts: Alt + ...
 *      n = next photo
 *      p = previous photo
 *      a = tag all people currently displayed in the dropdown
 *      z = un-tag the currently tagged
 *      + custom keys and names stored in extension storage
 *
 */
import {getSubdomain} from '../get-subdomain.js';

let inited = false;

function init() {
    // delete the background
    const bg = document.getElementById('dlg-background');
    bg && bg.remove();

    // left align
    // const doc = document.getElementById('document');
    // doc.style.marginLeft = 0;

    const input = document.querySelector('#tagging-ac input');
    const acList = document.querySelector('#tagging-ac ul');
    const taggingList = document.querySelector('#tagging-list ul');
    const prevEl = document.querySelector('a.prevTag');
    const nextEl = document.querySelector('a.nextTag');

    // gets the custom group map of shortcut key to array of players
    let sub = getSubdomain();
    let storageKey = `${sub}.tagging.groups`;
    let customMap = new Map();
    chrome.storage.sync.get(storageKey, ({[storageKey]: items}) => {
        // re-arrange by name for doing the shortcut marker in the list
        let byNames = items.reduce((acc, [key, list]) => {
            // set the map for the keyboard shortcuts
            customMap.set(key, list);

            list.forEach((name) => {
                (acc[name] ? acc[name] : acc[name] = []).push(key.toUpperCase());
            });

            return acc;
        }, {});

        // update the DOM to show the shortcuts in the list
        [...taggingList.querySelectorAll('li a.tag-link')]
            .forEach(el => {
                let name = el.textContent;
                if (byNames.hasOwnProperty(name)) {
                    let s = document.createElement('span');
                    s.classList.add('tag-list-me');
                    s.textContent = ` [${byNames[name].join(', ')}]`;

                    el.parentNode.insertBefore(s, el.nextSibling);
                }
            });
    });

    input.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch (e.key) {
                // alt + n = next photo
                case "n":
                    nextEl.click();
                    break;
                // alt + p = previous photo
                case "p":
                    prevEl.click();
                    break;
                // alt + a = all people in dropdown
                case "a":
                    [...acList.querySelectorAll('li a.tag-link')]
                        .filter(el => el.style.display === 'block')
                        .forEach(el => {
                            el.click();
                        });
                    break;
                // alt + z = undo, uncheck checked people
                case 'z':
                    [...taggingList.querySelectorAll('.tag-checked')]
                        .forEach(el => el.click());
                    break;

                // check for the custom defined options
                default:
                    if (customMap.has(e.key)) {
                        let customList = customMap.get(e.key);
                        [...taggingList.querySelectorAll('li a.tag-link')]
                            .filter(el => customList.includes(el.textContent))
                            .forEach(el => el.click());
                    }
                    break;
            }
        }
    });

    inited = true;
}

document.addEventListener('click', (e) => {
    if (
        !inited
        && e.path.includes(document.getElementById('pic-add-tag'))
    ) {
        setTimeout(init, 500);
    }
});