// content.js - This script runs in the context of web pages
let selectedText = "";

// Initialize the script
function init() {
    // Get any currently selected text
    selectedText = window.getSelection().toString().trim();

    // Listen for text selection
    document.addEventListener('mouseup', function() {
        selectedText = window.getSelection().toString().trim();
    });

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "getSelectedText") {
            sendResponse({selectedText: selectedText});
        }
        return true; // Keep the message channel open for async response
    });
}

// Run initialization
init();

// Log that content script has loaded
console.log("Review Analyzer content script loaded and ready");
