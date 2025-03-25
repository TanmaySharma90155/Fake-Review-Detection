// background.js
console.log('Background script loaded');

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveClassifications') {
    // Save classifications to storage
    console.log('Saving classifications to storage:', request.data);
    chrome.storage.local.set({ classifications: request.data }, () => {
      console.log('Classifications saved');
      sendResponse({ success: true });
      return true; // Keep the message channel open for async response (moved inside)
    });
    return true; // Keep the message channel open for async response (moved outside)
  } else if (request.action === 'getClassifications') {
    // Get classifications from storage
    console.log('Getting classifications from storage');
    chrome.storage.local.get(['classifications'], result => {
      console.log('Classifications retrieved:', result.classifications);
      sendResponse({ success: true, data: result.classifications || {} });
      return true; // Keep the message channel open for async response (moved inside)
    });
    return true; // Keep the message channel open for async response (moved outside)
  }
  return false; // Added a default return false
});
