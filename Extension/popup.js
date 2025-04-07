document.addEventListener('DOMContentLoaded', function() {
    const reviewText = document.getElementById('reviewText');
    const predictButton = document.getElementById('predictButton');
    const buttonText = document.querySelector('.button-text');
    const loader = document.getElementById('loader');
    const resultContainer = document.getElementById('resultContainer');
    const authenticityValue = document.getElementById('authenticityValue');
    const confidenceValue = document.getElementById('confidenceValue');
    const confidenceBar = document.getElementById('confidenceBar');
    const sentimentValue = document.getElementById('sentimentValue');

    // First inject the content script, then attempt to get selected text
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) return;

        // Try to inject the content script manually first
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
        }).then(() => {
            // Wait a moment for the script to initialize
            setTimeout(() => {
                // Then try to get the selected text
                chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"}, function(response) {
                    // Handle runtime.lastError
                    if (chrome.runtime.lastError) {
                        console.log("Error getting selected text:", chrome.runtime.lastError.message);
                        return;
                    }

                    if (response && response.selectedText) {
                        reviewText.value = response.selectedText;
                        // Enable button if text was found
                        predictButton.disabled = false;
                        predictButton.classList.remove('disabled');

                        // Auto-analyze the selected text
                        analyzeReview(response.selectedText);
                    }
                });
            }, 100);
        }).catch(err => {
            console.error("Could not inject content script:", err);
        });
    });

    // Enable/disable button based on textarea content
    reviewText.addEventListener('input', function() {
        const isEmpty = !this.value.trim();
        predictButton.disabled = isEmpty;
        predictButton.classList.toggle('disabled', isEmpty);
    });

    // Initial button state
    predictButton.disabled = true;
    predictButton.classList.add('disabled');

    predictButton.addEventListener('click', async () => {
        const review = reviewText.value.trim();
        if (!review) return;
        analyzeReview(review);
    });

    async function analyzeReview(review) {
        // Show loading state
        buttonText.innerText = "Analyzing...";
        loader.style.display = "block";
        predictButton.disabled = true;
        resultContainer.style.display = "none";

        try {
            const response = await fetch('http://127.0.0.1:5000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: review })
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                showError(`Analysis error: ${data.error}`);
            } else {
                // Process and display results
                displayResults(data);
            }
        } catch (error) {
            showError("Connection error: Unable to reach analysis server");
            console.error(error);
        } finally {
            // Reset button state
            buttonText.innerText = "Analyze";
            loader.style.display = "none";
            predictButton.disabled = false;
        }
    }

    function displayResults(data) {
        // Show result container with animation
        resultContainer.style.opacity = '0';
        resultContainer.style.display = "block";

        setTimeout(() => {
            resultContainer.style.opacity = '1';
            resultContainer.style.transition = 'opacity 0.3s ease';
        }, 10);

        // Set authenticity result with appropriate styling
        const isReal = data.result.toLowerCase() === "real";
        authenticityValue.innerText = isReal ? "Likely Genuine" : "Potentially Fake";
        authenticityValue.className = "value " + (isReal ? "genuine" : "suspicious");

        // Set confidence percentage and progress bar
        const confidence = data.probability_real.toFixed(1);
        confidenceValue.innerText = `${confidence}%`;

        // Update confidence bar
        confidenceBar.style.width = `${data.probability_real}%`;

        if (data.probability_real >= 70) {
            confidenceBar.className = "confidence-bar confidence-genuine";
        } else if (data.probability_real <= 40) {
            confidenceBar.className = "confidence-bar confidence-suspicious";
        } else {
            confidenceBar.className = "confidence-bar confidence-neutral";
        }

        // Set sentiment with appropriate styling
        const sentiment = capitalizeFirstLetter(data.sentiment);
        sentimentValue.innerText = sentiment;

        // Style sentiment based on value
        if (sentiment.toLowerCase().includes("positive")) {
            sentimentValue.className = "value genuine";
        } else if (sentiment.toLowerCase().includes("negative")) {
            sentimentValue.className = "value suspicious";
        } else {
            sentimentValue.className = "value neutral";
        }
    }

    function showError(message) {
        resultContainer.style.opacity = '0';
        resultContainer.style.display = "block";

        setTimeout(() => {
            resultContainer.style.opacity = '1';
            resultContainer.style.transition = 'opacity 0.3s ease';
        }, 10);

        authenticityValue.innerText = "Error";
        authenticityValue.className = "value suspicious";
        confidenceValue.innerText = message;
        confidenceValue.className = "value";
        confidenceBar.style.width = '0%';
        sentimentValue.innerText = "-";
        sentimentValue.className = "value";
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Add subtle animation when focusing on textarea
    reviewText.addEventListener('focus', function() {
        this.style.transform = 'translateY(-2px)';
    });

    reviewText.addEventListener('blur', function() {
        this.style.transform = 'translateY(0)';
    });
});
