from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Download required NLTK data
nltk.download('stopwords')
nltk.download('punkt')
nltk.download('vader_lexicon')

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Load the model and vectorizer
try:
    model = joblib.load('models/sgd_model.pkl')
    vectorizer = joblib.load('models/tfidf_vectorizer.pkl')
except Exception as e:
    print(f"Error loading model or vectorizer: {str(e)}")
    raise

# Preprocessing setup
stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()
sia = SentimentIntensityAnalyzer()

def preprocess_text(text):
    # Tokenize
    tokens = text.split()
    # Remove stop words
    tokens_no_stopwords = [word for word in tokens if word.lower() not in stop_words]
    # Stem the tokens
    tokens_stemmed = [stemmer.stem(word) for word in tokens_no_stopwords]
    # Join tokens back into a string
    cleaned_text = ' '.join(tokens_stemmed)
    return cleaned_text

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    try:
        # Preprocess the text
        cleaned_text = preprocess_text(text)
        # Vectorize the text
        text_vector = vectorizer.transform([cleaned_text])
        # Predict
        prediction = model.predict(text_vector)[0]
        probability = model.predict_proba(text_vector)[0]
        prob_real = probability[1]  # Probability of being real
        # If probability of being real > 50%, classify as real; otherwise, fake
        result = "Real" if prob_real > 0.5 else "Fake"
        # Get sentiment (for informational purposes)
        sentiment_score = sia.polarity_scores(cleaned_text)['compound']
        sentiment = 'Positive' if sentiment_score > 0 else 'Negative' if sentiment_score < 0 else 'Neutral'
        return jsonify({
            'result': result,
            'probability_real': prob_real * 100,  # Convert to percentage
            'sentiment': sentiment
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
