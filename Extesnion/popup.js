// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const analyzeButton = document.getElementById('analyzeButton');
  const statsElement = document.getElementById('stats');
  const totalCountElement = document.getElementById('totalCount');
  const realCountElement = document.getElementById('realCount');
  const fakeCountElement = document.getElementById('fakeCount');

  // Get the active tab
  try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      // Check if we're on an Amazon product page (only once)
      const isAmazonProductPage = activeTab.url.includes('amazon.com/') && activeTab.url.includes('/dp/');

      if (isAmazonProductPage) {
          statusElement.textContent = 'Ready to analyze reviews for this product.';
          analyzeButton.disabled = false;

          // Get any existing classifications from the background script
          chrome.runtime.sendMessage({ action: 'getClassifications' }, response => {
              if (response && response.success) {
                  if (Object.keys(response.data).length > 0) {
                      updateStats(response.data);
                  }
                  else {
                      statusElement.textContent = "No previous classifications found.";
                  }
              }
              else {
              statusElement.textContent = "Error retrieving classifications. Please try again.";

                  console.error('Error details:', response);
              }
          });

          // Set up the analyze button
          analyzeButton.addEventListener('click', async () => {
              // wait for the server to be available.
              const serverAvailable = await window.AmazonAPI.isServerAvailableCheck();
              if (!serverAvailable) {
                  statusElement.textContent = 'Server is not available.';
                  analyzeButton.disabled = true;
                  return;
              }
              // Update UI to show processing
              statusElement.textContent = 'Analyzing reviews...';
              analyzeButton.disabled = true;

              try {
                  // Send message to content script to start analysis
                  const response = await chrome.tabs.sendMessage(activeTab.id, {
                      action: 'initiateAnalysis'
                  });

                  console.log('Response from content script:', response);

                  if (response && response.success) {
                      // Update status and show stats
                      statusElement.textContent = 'Analysis complete!';

                      // Update stats display
                      updateStats(response.data);

                      // Enable the button again
                      analyzeButton.textContent = 'Re-analyze Reviews';
                      analyzeButton.disabled = false;
                  } else {
                      console.error('Error details:', response);
                  statusElement.textContent = 'Error analyzing reviews. Please check the server status and try again.';

                      analyzeButton.disabled = false;
                  }
              } catch (error) {
                  console.error('Detailed error in review analysis:', error);
                  statusElement.textContent = 'Communication error. Please refresh the page and try again.';
                  analyzeButton.disabled = false;
              }
          });
      } else {
          statusElement.textContent = 'Please navigate to an Amazon product page to use this extension.';
      }
  } catch (error) {
      console.error('Error in popup:', error);
      statusElement.textContent = 'Error. Please try again.';
  }

  function updateStats(classifications) {
      try {
          // Calculate stats
          const total = Object.keys(classifications).length;
          let realCount = 0;

          for (const reviewId in classifications) {
              if (classifications[reviewId].isReal) {
                  realCount++;
              }
          }

          const fakeCount = total - realCount;

          // Update the stats display
          totalCountElement.textContent = total;
          realCountElement.textContent = realCount;
          fakeCountElement.textContent = fakeCount;

          // Show the stats section if we have data
          if (total > 0) {
              statsElement.style.display = 'block';
          }
      } catch (error) {
          console.error('Error updating stats:', error);
          statusElement.textContent = 'Error updating stats.';
      }
  }
});
