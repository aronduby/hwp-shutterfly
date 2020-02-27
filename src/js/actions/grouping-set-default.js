import {getSubdomain} from "../get-subdomain";
import {getTabUrl} from "../get-tab-url";

export const defaultGroups = [
    ['j', ['Aiden McDowell', 'Ben Harris', 'Brendan LaFrenier', 'Bryce Laning', 'Casey Fields', 'Cooper Randall', 'Declan Edema', 'Dylan VanderJagt', 'Ethan Dennis', 'Gabe Karel', 'Henry Booker', 'Jack Bradley', 'Jack Roehling', 'Jacob Ellis', 'Joseph Maldonado', 'Matt Karel', 'Matthew Welmerink', 'Nathan Porter', 'Nolan Marx', 'Sam Lobbezoo', 'Tyler Chalmers', 'Will Schuiteman']],
    ['v', ['Andy Lobbezoo', 'Chandler Jones', 'Colin McDowell', 'Dallas Grandy', 'Elijah Boonstra', 'Ethan Holwerda', 'Gabe Ecenbarger', 'Ian Worst', 'John Dirkse', 'Micah Bayle', 'Nate Chalmers', 'Parker Molewyk', 'Patrick Tutt', 'Sam Myaard', 'Tyler Bayle', 'Wesley Obetts']],
    ['s', ['Andy Lobbezoo', 'Chandler Jones', 'Dallas Grandy', 'Ian Worst', 'John Dirkse', 'Parker Molewyk', 'Patrick Tutt', 'Sam Myaard', 'Wesley Obetts']]
];

export async function setDefaultGroups() {
    let url = await getTabUrl();
    let sub = getSubdomain(url);
    let storageKey = `${sub}.tagging.groups`;

    chrome.storage.sync.set({[storageKey]: defaultGroups}, function() {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            alert('Save errored, see console');
        } else {
            alert('Save success!');
        }
    });
}