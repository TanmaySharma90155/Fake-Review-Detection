// content.js - This script runs in the context of web pages
let selectedText = "";

// Listen for text selection
document.addEventListener('mouseup', function() {
    selectedText = window.getSelection().toString().trim();
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getSelectedText") {
        sendResponse({selectedText: selectedText});
    }
    return true;
});
