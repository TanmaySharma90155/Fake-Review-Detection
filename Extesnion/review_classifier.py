import joblib

import numpy as np
import re
import os
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
import logging  # Add logging import

class ReviewClassifier:
    def __init__(self, model_path=None):
        # Configure NLTK data path
        nltk_data_dir = os.path.join(os.path.expanduser("~"), "nltk_data")
        os.makedirs(nltk_data_dir, exist_ok=True)
        nltk.data.path.append(nltk_data_dir)  # Add to NLTK's search path

        # Download required NLTK resources
        nltk_resources = ['stopwords', 'wordnet', 'punkt', 'vader_lexicon']
        for resource in nltk_resources:
            try:
                nltk.data.find(resource)
            except LookupError:
                try:
                    nltk.download(resource, quiet=True, download_dir=nltk_data_dir)
                except Exception as e:
                    print(f"Error downloading {resource}: {str(e)}")

        # Initialize NLP components with fallbacks
        try:
            self.stop_words = set(stopwords.words('english'))
        except:
            self.stop_words = set(['the', 'and', 'is', 'in', 'it', 'to', 'of'])

        try:
            self.stemmer = PorterStemmer()
        except:
            self.stemmer = type('SimpleStemmer', (), {'stem': lambda self, word: word[:5]})()

        try:
            self.sia = SentimentIntensityAnalyzer()
        except:
            self.sia = type('DummyAnalyzer', (), {
                'polarity_scores': lambda self, text: {'compound': 0.0}
            })()

        # Load model and vectorizer if path provided
        logger.info("Loading model and vectorizer from: %s", model_path)  # Log the loading process

        self.model = None
        self.vectorizer = None
        if model_path:
            try:
                self.model = joblib.load(model_path)  # Load the entire pipeline
                self.vectorizer = self.model.named_steps['tfidfvectorizer']  # Extract the vectorizer

                logger.info("Model and vectorizer loaded successfully.")  # Log success
            except Exception as e:
                logger.error(f"Model and vectorizer loading failed: {str(e)}")  # Log the error

    def preprocess_text(self, text):
        # Text cleaning and preprocessing
        text = re.sub(r'[^a-zA-Z\s]', '', text)  # Remove non-alphabetic characters
        text = text.lower()  # Convert to lowercase

        words = nltk.word_tokenize(text)
        words = [self.stemmer.stem(w) for w in words if w not in self.stop_words]
        return ' '.join(words)

    def extract_features(self, text):
        preprocessed = self.preprocess_text(text)  # Preprocess the text while it is still a string

        logger.debug("Preprocessed text: %s", preprocessed)  # Log the preprocessed text

        # TF-IDF features
        tfidf_features = self.vectorizer.transform([preprocessed]).toarray()[0]

        # Sentiment features
        sentiment = self.sia.polarity_scores(preprocessed)
        sentiment_features = [sentiment['compound']]

        combined_features = np.concatenate([tfidf_features, sentiment_features]).reshape(1, -1)  # Ensure correct shape

        logger.debug("Combined features type: %s, content: %s", type(combined_features), combined_features)  # Log the combined features

        return combined_features

    def predict(self, text):
        logger.debug("Input text type: %s, content: %s", type(text), text)  # Log the input text

        if not self.model or not self.vectorizer:
            raise Exception("Model not loaded")

        if not isinstance(text, str):
            text = str(text)  # Ensure text is a string
        features = self.extract_features(text)  # Pass the text directly

        logger.debug("Extracted features type: %s, content: %s", type(features), features)  # Log the extracted features

        # Ensure features are in the correct format for the model
        if isinstance(features, np.ndarray):
            features = features.reshape(1, -1)  # Reshape for model input

        return self.model.predict(features)[0]
