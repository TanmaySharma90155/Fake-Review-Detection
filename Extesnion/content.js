// content.js
console.log('Amazon Review Analyzer content script loaded');

// Flag to prevent adding the button multiple times
window.analyzeButtonAdded = false;

// Add review classification indicators to the page
function addReviewIndicators(classifications) {
  console.log('Adding review indicators', classifications);

  try {
    const reviewElements = document.querySelectorAll(
      'div[data-hook="review"], .a-section.review, .a-section.celwidget'
    );
    console.log('Found', reviewElements.length, 'reviews to add indicators to');
    reviewElements.forEach(review => {
      // Try multiple approaches to get review ID
      let reviewId = null;
      if (review.getAttribute('id')) {
        reviewId = review.getAttribute('id').replace('customer_review-', '');
      }
      if (!reviewId) {
        console.warn("Missing reviewId, skipping");
        return;
      }

      const classification = classifications[reviewId];

      if (classification) {
        // Create the indicator element
        const indicator = document.createElement('span');
        indicator.style.marginLeft = '10px';
        indicator.style.fontSize = '1.2em';

        // Add tooltip for confidence and sentiment
        indicator.title = `Confidence: ${(classification.confidence * 100).toFixed(2)}%
Sentiment: ${classification.sentiment}`;

        // Set the indicator (checkmark or cross)
        if (classification.isReal) {
          indicator.textContent = '✓';
          indicator.style.color = 'green';
        } else {
          indicator.textContent = '✘';
          indicator.style.color = 'red';
        }

        // Apply a style to the review element
        review.style.border = '1px solid #ddd';
        review.style.padding = '10px';
        review.style.borderRadius = '5px';
        review.style.marginBottom = '10px';

        // Append the indicator to the review
        const reviewHeader = review.querySelector('.a-profile');
        if (reviewHeader) {
          reviewHeader.appendChild(indicator);
        } else {
          console.warn('Review header not found, cannot append indicator');
        }
      } else {
        console.warn('Classification not found for review ID:', reviewId);
      }
    });
    console.log('Finished adding review indicators');
  } catch (error) {
    console.error('Error adding review indicators:', error);
  }
}

// Analyze reviews on the current page
async function analyzePageReviews(api) {
  console.log('Starting page review analysis');
  // Check server availability
  const isAvailable = await api.checkServerAvailability();
  if (!isAvailable) {
    throw new Error(
      'Server is not available. Please make sure the server is running on localhost:5000'
    );
  }

  // Initialize reviews
  let reviews = [];
  try {
    reviews = await api.getReviews();
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw error;
  }

  console.log(`Found ${reviews.length} reviews to classify`);

  // Classify each review
  const classifications = {};
  for (const review of reviews) {
    try {
      const classification = await api.classifyReview(review);
      classifications[review.id] = classification;
      classifications[review.id].text = review.text.substring(0, 20);
      console.log(`Classified review ${review.id} as`, classification);
    } catch (error) {
      console.error(`Error classifying review ${review.id}:`, error);
    }
  }

  console.log('Finished classifying reviews');
  // Store the classifications in the background script
  chrome.runtime.sendMessage({ action: 'saveClassifications', data: classifications });

  // Add the indicators
  addReviewIndicators(classifications);

  return classifications;
}

// Add analyze button to the page - IMPROVED VERSION
function addAnalyzeButton(api) {
  if (window.analyzeButtonAdded) {
    console.log('Button already added, skipping');
    return;
  }
  try {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '10px';

    const button = document.createElement('button');
    button.id = 'analyzeButton';
    button.textContent = 'Analyze Reviews';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.padding = '10px 20px';
    button.style.textAlign = 'center';
    button.style.textDecoration = 'none';
    button.style.display = 'inline-block';
    button.style.fontSize = '16px';
    button.style.margin = '4px 2px';
    button.style.cursor = 'pointer';
    button.style.borderRadius = '5px';

    const statusElement = document.createElement('span');
    statusElement.id = 'status';
    statusElement.textContent = '';

    container.appendChild(button);
    container.appendChild(statusElement);

    // Define potential targets for button insertion
    const potentialTargets = [
      document.getElementById('cm_cr-review_list'),
      document.getElementById('reviews-medley-footer'),
      document.querySelector('.reviews-content'),
      document.getElementById('customerReviews'),
      document.getElementById('cm-cr-dp-review-list')
    ];

    let inserted = false;
    for (const target of potentialTargets) {
      if (target) {
        console.log('Found a valid target for button insertion:', target);
        target.parentNode.insertBefore(container, target);
        console.log('Amazon Review Analyzer button added successfully');
        inserted = true;
        break;
      }
    }

    // If we couldn't find any of the targets, insert a fixed position button
    if (!inserted) {
      console.log('No standard targets found, adding fixed position button');
      container.style.position = 'fixed';
      container.style.top = '100px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.maxWidth = '300px';
      document.body.appendChild(container);
      console.log('Amazon Review Analyzer button added in fixed position');
    }

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Analyzing...';
      statusElement.textContent = 'Analyzing reviews, please wait...';

      try {
        const classifications = await analyzePageReviews(api);
        console.log('Analysis completed:', classifications);
        button.textContent = 'Re-analyze Reviews';
        statusElement.textContent = 'Analysis complete!';
      } catch (error) {
        console.error('Error during analysis:', error);
        statusElement.textContent = 'Error: ' + error.message;
      } finally {
        button.disabled = false;
      }
    });
    window.analyzeButtonAdded = true;
  } catch (error) {
    console.error('Error adding analyze button:', error);
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'initiateAnalysis') {
    const api = window.AmazonAPI;
    if (!api) {
      sendResponse({ success: false, error: 'API not available.' });
      return false;
    }
    analyzePageReviews(api)
      .then(classifications => {
        sendResponse({ success: true, data: classifications });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  } else if (request.action === 'getClassifications') {
    // Handle the request
    console.log('getClassifications requested.');
    chrome.storage.local.get(['classifications']).then(result => {
      console.log('Classifications retrieved:', result.classifications);
      sendResponse({ success: true, data: result.classifications || {} });
    }).catch(error => {
      console.error('Error getting classifications:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  else if (request.action === 'saveClassifications') {
    // Handle saving classifications (if needed)
    console.log('Saving classifications:', request.data);
    return true;
  }
  return false;
});

// Add script to handle API calls
function addApiScript(callback) {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('api.js');
    script.type = 'text/javascript';
    script.onload = function () {
      console.log('API script loaded successfully');
      if (callback) callback(window.AmazonAPI);
    };
    script.onerror = function () {
      console.error('Failed to load API script');
      if (callback) callback(undefined);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error adding API script:', error);
    if (callback) callback(undefined);
  }
}

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  console.log('Amazon Review Analyzer: page loaded, attempting to add button');

  // Add API script
  addApiScript(api => {
    // Try multiple times with shorter delays and a maximum number of retries
    const delays = [500, 1000, 2000]; // Shorter delays
    const maxRetries = delays.length;
    let retries = 0;

    const tryAddButton = () => {
      console.log(`Trying to add button (attempt ${retries + 1} of ${maxRetries})`);
      addAnalyzeButton(api); // Make sure api is properly passed here

      retries++;
      if (retries < maxRetries && !window.analyzeButtonAdded) {
        setTimeout(tryAddButton, delays[retries]); // Retry with the next delay
      }
    };

    tryAddButton(); // Start trying to add the button
  });

  // Load any previously analyzed reviews for this page
  setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'getClassifications' }, response => {
      if (response && response.success && Object.keys(response.data).length > 0) {
        addReviewIndicators(response.data);
      }
    });
  }, 2000);
});

// Watch for changes in the DOM to catch dynamically loaded review sections
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      // Check if any reviews section was added
      const reviewsSection = document.getElementById('reviews-medley-footer') ||
        document.querySelector('.reviews-content') ||
        document.getElementById('customerReviews') ||
        document.getElementById('cm-cr-dp-review-list');

      if (reviewsSection) {
        console.log('Detected dynamically loaded review section');
        const api = window.AmazonAPI; //get the api object
        if (api && !window.analyzeButtonAdded) {
          addAnalyzeButton(api); //send the api object
        }

        // Check if we have previously analyzed reviews to display
        chrome.runtime.sendMessage({ action: 'getClassifications' }, response => {
          if (response && response.success && Object.keys(response.data).length > 0) {
            addReviewIndicators(response.data);
          }
        });

        break;
      }
    }
  }
});

// Start observing after a short delay
setTimeout(() => {
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('Amazon Review Analyzer: mutation observer started');
}, 2000);
