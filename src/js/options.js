import "../css/_variables.css";
import "../css/options.css";
import deepmerge from "deepmerge";

const settingsTemplate = require("../templates/options.hbs");
const domainListItemPartial = require('../templates/partials/options/domain-list-item.hbs');
const domainListEmptyPartial = require('../templates/partials/options/domain-list-empty.hbs');

const STORAGE_KEY = 'extension.settings';
const DEFAULT_SETTINGS = {
    domains: [],
    activeDomain: null
};

let activeDomain;

// object of handlers for elements that use data-action-click
const actions = {
    click: {
        addDomain,
        removeDomain,
        saveOptions
    },
    submit: {
        saveOptions
    }
};

/**
 * Run init after our settings have been loaded and the dom is ready
 */
Promise.all([
    loadSettings(),
    new Promise((resolve, reject) => {
        document.addEventListener("DOMContentLoaded", function () {
            resolve();
        });
    })
]).then(init, handleError);

/**
 * Loads our settings out of the sync storage
 *
 * @returns {Promise<object>}
 */
async function loadSettings() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(STORAGE_KEY, ({[STORAGE_KEY]: storedSettings}) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            resolve(deepmerge(DEFAULT_SETTINGS, storedSettings || {}));
        });
    });
}

/**
 * Writes the setting object into sync storage
 *
 * @param settings
 * @returns {Promise<boolean, string>}
 */
async function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({[STORAGE_KEY]: settings}, function() {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            resolve(true);
        });
    });
}

/**
 * There was an error...
 * @param err
 */
function handleError(err) {
    console.error(err);
    alert('Sorry, something went wrong');
}

/**
 * Once our settings have been loaded AND the dom is ready, setup the page
 * @param settings
 */
function init([settings]) {
    activeDomain = settings.activeDomain;

    const container = document.createElement('form');
    container.classList.add('content', 'options');
    container.dataset.submitHandler='saveOptions';
    container.innerHTML = settingsTemplate(settings);
    document.body.appendChild(container);

    // setup magic event handlers
    // <button data-click-handler="addDomain">Add Domain</button>
    Object.keys(actions).forEach((action) => {
        container.addEventListener(action, (e) => {
            const prop = `${action}Handler`;
            const handler = e.target.dataset[prop];
            if (handler && actions[action][handler]) {
                actions[action][handler](e)
            }
        });
    });
}

/**
 *
 * Event Handlers
 *
 */

/**
 * Adds a new domain row to the interface
 *
 * @param {MouseEvent} e
 */
function addDomain(e) {
    e.preventDefault();
    const wrapper = document.getElementById('domain-wrapper');
    let i = parseInt(wrapper.dataset.domainLength, 10);

    const holder = document.createElement('div');
    holder.innerHTML = domainListItemPartial({
        domain: '',
        activeDomain,
        i
    });

    wrapper.appendChild(holder.firstChild);
    wrapper.dataset.domainLength = ++i;

    const emptyLi = wrapper.querySelector('.empty');
    if (emptyLi) {
        emptyLi.remove();
    }
}

/**
 * Removes and existing (non-active) domain row from the dom
 *
 * @param {MouseEvent} e
 */
function removeDomain(e) {
    const li = e.target.parentNode;
    const wrapper = li.parentNode;

    const active = li.querySelector('input[name="active"]').checked;

    if (active) {
        alert('Can not remove the active domain. Please set something else to active first.');
        return;
    }

    li.remove();
    wrapper.dataset.domainLength = wrapper.childElementCount;

    if (wrapper.childElementCount === 0) {
        wrapper.innerHTML = domainListEmptyPartial();
    }
}

/**
 * Save the options
 *
 * @param {Event} e
 */
function saveOptions(e) {
    e.preventDefault();

    const fd = new FormData(e.target);
    const domains = fd.getAll('domains');
    const activeDomainIdx = fd.get('activeDomain');
    const activeDomain = domains[activeDomainIdx];

    const settings = {
        domains,
        activeDomain
    };

    saveSettings(settings)
        .then(() => alert('Save Successful'), handleError);
}

