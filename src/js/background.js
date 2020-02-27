import '../img/icon-34.png'
import '../img/icon-34-inverted.png'
import '../img/icon-128.png'
import '../img/icon-128-inverted.png'

// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {

        // With a new rule ...
        chrome.declarativeContent.onPageChanged.addRules([
            {
                // That fires when a page's URL contains a 'g' ...
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            hostContains: '.shutterfly.com',
                            pathEquals: '/roster'
                        },
                    })
                ],
                // And shows the extension's page action.
                actions: [
                    new chrome.declarativeContent.ShowPageAction()
                ]
            }
        ]);
    });
});