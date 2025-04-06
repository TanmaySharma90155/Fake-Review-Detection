# MODEL TRAINED FOR fake_reviews.csv file

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import SGDClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Download required NLTK data
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('punkt')
nltk.download('vader_lexicon')

# Dataset path
DATA_PATH = r"E:/coding/fake-review/fake_reviews.csv"

# Preprocessing functions
stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()

# Load dataset
data = pd.read_csv(DATA_PATH)
print("--------------------------------------------------------------------------------")
print(f"Dataset loaded: {data.shape}")
print(f"Class distribution:\n{data['label'].value_counts()}")
print("--------------------------------------------------------------------------------")

# Preprocess the text
data['tokens'] = data['text_'].apply(lambda x: x.split())
data['tokens_no_stopwords'] = data['tokens'].apply(lambda x: [word for word in x if word.lower() not in stop_words])
data['tokens_stemmed'] = data['tokens_no_stopwords'].apply(lambda x: [stemmer.stem(word) for word in x])
data['cleaned_text'] = data['tokens_stemmed'].apply(lambda x: ' '.join(x))

# Sentiment analysis
sia = SentimentIntensityAnalyzer()

def get_sentiment(text):
    sentiment_score = sia.polarity_scores(text)['compound']
    if sentiment_score > 0:
        return 'Positive'
    elif sentiment_score < 0:
        return 'Negative'
    else:
        return 'Neutral'

data['sentiment'] = data['cleaned_text'].apply(get_sentiment)
print(f"\nSentiment distribution:\n{data['sentiment'].value_counts()}")

# Split the dataset
X = data['cleaned_text']
y = data['label']  # Assumes binary 'label' (1 = real, 0 = fake)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Vectorize the text
vector = TfidfVectorizer(stop_words='english')
X_train_vector = vector.fit_transform(X_train)
X_test_vector = vector.transform(X_test)

# Train the model with loss='log_loss' to enable predict_proba
model = SGDClassifier(loss='log_loss', max_iter=45000, penalty='l2', alpha=0.0001)

# Cross-validation
cv_scores = cross_val_score(model, X_train_vector, y_train, cv=10, scoring='accuracy')
print("\n--------------------------------------------------------------------------------")
print(f"Cross-validation scores for each fold: {cv_scores}")
print(f"-----> Mean accuracy across all folds: {cv_scores.mean() * 100:.2f}%")
print(f"-----> Maximum accuracy across all folds: {cv_scores.max() * 100:.2f}%")
print(f"-----> Standard deviation of accuracy across folds: {cv_scores.std() * 100:.2f}%")
print("--------------------------------------------------------------------------------")

# Fit the model
model.fit(X_train_vector, y_train)

# Evaluate the model
y_pred = model.predict(X_test_vector)
print("\nClassification Report:\n" + classification_report(y_test, y_pred))
print("--------------------------------------------------------------------------------")
print("Confusion Matrix:\n" + str(confusion_matrix(y_test, y_pred)))

# Save the model and vectorizer
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/sgd_model.pkl')
joblib.dump(vector, 'models/tfidf_vectorizer.pkl')
print("Model and vectorizer saved to 'models' directory.")
