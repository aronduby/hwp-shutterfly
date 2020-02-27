export async function getTabUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            resolve(tabs[0].url);
        });
    });
}