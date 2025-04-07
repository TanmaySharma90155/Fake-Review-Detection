// Listen for tab activation or updates to inject content script if needed
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.scripting.executeScript({
        target: {tabId: activeInfo.tabId},
        files: ['content.js']
    }).catch(err => console.error("Error injecting content script:", err));
});

// Log that the background service worker has started
console.log("Review Analyzer background service worker started");
