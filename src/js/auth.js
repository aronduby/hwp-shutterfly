import { settings } from './settings';

let token;
let expiration;

const clientId = '3';
const scopes = ['*'];

const callbacks = [];

async function login(interactive = true) {
    debugger;
    const authBase = `${await settings.baseUrl}/oauth/authorize`;

    const redirectURL = chrome.identity.getRedirectURL('hwp');
    const authParams = new URLSearchParams({
        client_id: clientId,
        response_type: 'token',
        redirect_uri: redirectURL,
        scope: scopes.join(' '),
    });

    const authURL = `${authBase}?${authParams.toString()}`;

    return new Promise(((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authURL, interactive: interactive }, function(responseUrl) {
            if (!responseUrl) {
                return reject(`Rejection. Is the redirect url '${redirectURL}' correct? `);
            }

            const url = new URL(responseUrl);
            const urlParams = new URLSearchParams(url.hash.slice(1));
            const params = Object.fromEntries(urlParams.entries()); // access_token, expires_in

            token = params.access_token;
            expiration = params.expires_in;

            resolve({token, expiration});
            callbacks.forEach(cb => cb(true, params));
        });
    }));
}

function addCallback(cb) {
    callbacks.push(cb);
}

export {token, login, addCallback};