import { STORAGE_KEY } from "./options-storage-key";

let data = {};

const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';

let loadingState = PENDING;

const loadingPromise = new Promise((resolve, reject) => {
    chrome.storage.sync.get(STORAGE_KEY, ({[STORAGE_KEY]: storedSettings}) => {
        if (chrome.runtime.lastError) {
            loadingState = REJECTED;
            return reject(chrome.runtime.lastError);
        }

        data = {
            activeDomain: `https://${storedSettings.activeDomain}`
        };

        loadingState = RESOLVED;
        resolve(data);
    });
});

async function get(propPath) {
    switch (loadingState) {
        case RESOLVED:
            return Promise.resolve(data[propPath]);

        case PENDING:
            return loadingPromise.then((data) => data[propPath]);

        case REJECTED:
            alert('EVERYTHING IS ON FIRE AND WHERE ARE THESE BEES COMING FROM?!?!');
            break;
    }
}

export class settings {

    static get baseUrl() {
        return Promise.resolve(get('activeDomain'));
    }
}