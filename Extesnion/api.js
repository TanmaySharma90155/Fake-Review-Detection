// api.js
class AmazonAPI {
    constructor() {
      // Base URL for our Flask server
      this.serverBaseUrl = 'http://localhost:5000';
      this.isServerAvailable = false;
      // Check server availability on initialization
      this.checkServerAvailability();
    }

    /**
     * Check if the server is available
     */
    async checkServerAvailability() {
      try {
        const response = await fetch(`${this.serverBaseUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          this.isServerAvailable = data.status === 'healthy';
          console.log(`Server is ${this.isServerAvailable ? 'available' : 'unavailable'}`);
        }
      } catch (error) {
        console.error('Server is unavailable:', error);
        this.isServerAvailable = false;
      }
      return this.isServerAvailable;
    }

    /**
     * Fetches reviews from the current Amazon page
     * @returns {Promise<Array>} - Array of review objects
     */
    async getReviews() {
      try {
        // Try multiple selectors to find reviews as Amazon's structure may vary
        const reviewSelectors = [
          '.review',
          '[data-hook="review"]',
          '.a-section.review',
          '.a-section.celwidget'
        ];

        let reviews = [];
        let reviewElements = null;

        // Try each selector until we find reviews
        for (const selector of reviewSelectors) {
          reviewElements = document.querySelectorAll(selector);
          if (reviewElements && reviewElements.length > 0) {
            console.log(`Found ${reviewElements.length} reviews using selector: ${selector}`);
            break;
          }
        }

        if (!reviewElements || reviewElements.length === 0) {
          console.warn('No reviews found on page');
          return [];
        }

        reviewElements.forEach(review => {
          // Try multiple approaches to get review ID
          let reviewId = null;
          if (review.getAttribute('id')) {
            reviewId = review.getAttribute('id').replace('customer_review-', '');
          } else if (review.getAttribute('data-hook') === 'review') {
            reviewId = `review-${Math.random().toString(36).substring(2, 10)}`;
          }

          if (!reviewId) return;

          // Try multiple selectors for review title
          const titleSelectors = ['.review-title', '[data-hook="review-title"]', '.a-size-base.a-link-normal.review-title'];
          let reviewTitle = '';
          for (const selector of titleSelectors) {
            const titleElement = review.querySelector(selector);
            if (titleElement) {
              reviewTitle = titleElement.innerText;
              break;
            }
          }

          // Try multiple selectors for review text
          const textSelectors = ['.review-text', '[data-hook="review-body"]', '.a-size-base.review-text'];
          let reviewText = '';
          for (const selector of textSelectors) {
            const textElement = review.querySelector(selector);
            if (textElement) {
              reviewText = textElement.innerText;
              break;
            }
          }

          // Try multiple approaches to get rating
          let rating = 0;
          const ratingSelectors = ['.a-icon-alt', '[data-hook="review-star-rating"]', '.a-icon-star'];
          for (const selector of ratingSelectors) {
            const ratingElement = review.querySelector(selector);
            if (ratingElement) {
              const ratingText = ratingElement.innerText || ratingElement.getAttribute('title') || '';
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
              if (ratingMatch) {
                rating = parseFloat(ratingMatch[0]);
                break;
              }
            }
          }

          // Try multiple selectors for date
          const dateSelectors = ['.review-date', '[data-hook="review-date"]'];
          let date = '';
          for (const selector of dateSelectors) {
            const dateElement = review.querySelector(selector);
            if (dateElement) {
              date = dateElement.innerText;
              break;
            }
          }

          if (reviewText) {
            extractedReviews.push({
              id: reviewId,
              title: reviewTitle,
              text: reviewText,
              rating: rating,
              date: date
            });
          }
        });

        console.log(`Successfully extracted ${extractedReviews.length} reviews`);
        return extractedReviews;
      } catch (error) {
        console.error('Error extracting reviews from page:', error);
        return [];
      }
    }

    /**
     * Classifies a review as real or fake using the AI model
     * @param {Object} review - Review object containing id, text, etc.
     * @returns {Promise<Object>} - Classification result
     */
    async classifyReview(review) {
      try {
        // Check if server is available
        if (!this.isServerAvailable) {
          const isAvailable = await this.checkServerAvailability();
          if (!isAvailable) {
            throw new Error('Server is not available. Please make sure the server is running on localhost:5000');
          }
        }

        // API endpoint where our Python model is hosted
        const endpoint = `${this.serverBaseUrl}/classify`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reviewId: review.id,
            reviewText: review.text || "",
            reviewTitle: review.title || "",
            reviewRating: review.rating || 0,
            reviewDate: review.date || ""
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        return {
          isReal: result.isReal,
          confidence: result.confidence,
          sentiment: result.sentiment
        };
      } catch (error) {
        console.error('Error classifying review:', error);
        // Provide a more graceful fallback
        return {
          isReal: true,
          confidence: 0.5,
          sentiment: 'Neutral',
          error: error.message
        };
      }
    }
  }

  // Export the API class
  window.AmazonAPI = new AmazonAPI();
