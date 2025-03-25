from flask import Flask, jsonify, request
from review_classifier import ReviewClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import SGDClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
import joblib  # For saving the model and vectorizer


app = Flask(__name__)
# Load dataset
data = pd.read_csv('C:\\Users\\KIIT\\OneDrive\\Desktop\\fake_reviews.csv')  # Ensure this path is correct


X = data['text_']  # Updated to match the actual column name in the dataset

y = data['category']  # Updated to match the actual label column name in the dataset


# Load dataset with error handling
try:
    data = pd.read_csv('C:\\Users\\KIIT\\OneDrive\\Desktop\\fake_reviews.csv')  # Ensure this path is correct
except Exception as e:
    logger.error(f"Error loading dataset: {str(e)}")  # Log the error
    raise

# Split the dataset into training and testing sets

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Create a pipeline for TF-IDF and SGD Classifier
pipeline = make_pipeline(TfidfVectorizer(), SGDClassifier())

logger.info("Training the model...")  # Log the training process

pipeline.fit(X_train, y_train)

# Save the model and vectorizer
joblib.dump(pipeline, 'models/sgd_model.pkl')  # Save the entire pipeline


@app.route('/')
def home():
    return jsonify({
        'status': 'active',
        'message': 'Review classifier service',
        'endpoints': ['GET /', 'POST /predict']
    })

classifier = ReviewClassifier(model_path='models/sgd_model.pkl')  # Load the trained model

def predict_review():
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        if not classifier:  # Ensure the model is loaded before making predictions
            return jsonify({'error': 'Model not loaded'}), 500

        prediction = classifier.predict(text)  # Ensure the model is loaded before making predictions

        return jsonify({
            'text': text,
            'prediction': int(prediction),
            'interpretation': 'Positive' if prediction == 1 else 'Negative'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
