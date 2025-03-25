from flask import Flask, jsonify, request
import logging  # Add logging import

# Configure logging
logging.basicConfig(level=logging.INFO)  # Set logging level to INFO
logger = logging.getLogger(__name__)  # Create a logger instance

from review_classifier import ReviewClassifier
from flask_cors import CORS  # Add this import

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize model_loaded and classifier
model_loaded = False
classifier = None

# Try to load the model with graceful fallback if it fails
try:
    classifier = ReviewClassifier(model_path='models/sgd_model.pkl')
    model_loaded = True
except Exception as e:
    logger.error("Error loading model: %s", str(e))  # Log the error

@app.route('/')
def home():
    logger.info("Home endpoint accessed")  # Log access to the home endpoint
    return jsonify({
        'status': 'active',
        'model_loaded': model_loaded,
        'message': 'Review classifier service'
    })

@app.route('/predict', methods=['POST'])
def predict_review():
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        text = data.get('text', '')
        if not isinstance(text, str):
            text = str(text)  # Convert to string if it's not

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        prediction = classifier.predict(text)

        # Convert numpy value to Python int
        if hasattr(prediction, 'item'):  # Check if it's a numpy type
            prediction_value = prediction.item()
        else:
            prediction_value = int(prediction)

        return jsonify({
            'text': text,
            'prediction': prediction_value,
            'interpretation': 'Positive' if prediction_value == 1 else 'Negative'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
