let bgp = chrome.extension.getBackgroundPage();


export async function login() {
    let {token, expiration} = await bgp.auth.login();
    console.log(token, expiration);
}

export function logToken() {
    console.log(bgp.auth.token);
}