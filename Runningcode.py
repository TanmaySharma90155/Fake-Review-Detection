import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.metrics import classification_report
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LogisticRegression 
from sklearn.naive_bayes import MultinomialNB
from sklearn.naive_bayes import BernoulliNB
from sklearn.linear_model import SGDClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn import metrics
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import GridSearchCV
import re 
import string

nltk.download('stopwords') # removes common words
nltk.download('wordnet') # used to convert word into its original form
nltk.download('punkt') # tokenization; splitting words in sentences
# reading the data
data = pd.read_csv(r"C:\Users\KIIT\Desktop\mini project\fake reviews dataset.csv")
print(data.shape)
data.head()

data['label'].value_counts()

#preprocessing functions
stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()

data['tokens'] = data['text_'].apply(lambda x: x.split())
data['tokens_no_stopwords'] = data['tokens'].apply(lambda x: [word for word in x if word.lower() not in stop_words])

data['tokens_stemmed'] = data['tokens_no_stopwords'].apply(lambda x: [stemmer.stem(word) for word in x])

data['cleaned_text'] = data['tokens_stemmed'].apply(lambda x: ' '.join(x))

data.head()

# Initialize the SentimentIntensityAnalyzer (VADER)

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

# Count the number of occurrences of each sentiment type
sentiment_counts = data['sentiment'].value_counts().reset_index()
sentiment_counts.columns = ['Sentiment', 'Count']


# Create a bar plot for overall sentiment distribution
plt.figure(figsize=(5, 3))
sns.barplot(x='Sentiment', y='Count', data=sentiment_counts, palette='viridis')
plt.title('Overall Sentiment Distribution')
plt.xlabel('Sentiment')
plt.ylabel('Count')
plt.show()

# If 'label' column contains categories, you can group by it
plt.figure(figsize=(5,3))
sns.countplot(x='sentiment', hue='label', data=data, palette='Set2')
plt.title('Sentiment vs Label')
plt.xlabel('Sentiment')
plt.ylabel('Count')
plt.show()

X = data['cleaned_text']  # Feature (text data)
y = data['label']  # Target (label data)
#splitting data into 80% and 20%
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)


print(X_train.shape)
print(X_test.shape)
#Using tf-idf vectorization
vector = TfidfVectorizer(stop_words='english')

X_train_vector = vector.fit_transform(X_train)
X_test_vector = vector.transform(X_test)

#using regularisation for minimum error
model = SGDClassifier(max_iter=45000, penalty='l2', alpha=0.0001, loss='log_loss')
# cross validataion splits the data set in k parts and then finds the mean accuracy for the whole
cv_scores = cross_val_score(model, X_train_vector, y_train, cv=10, scoring='accuracy') 
print(f"Cross-validation scores for each fold: {cv_scores}")

mean_accuracy = cv_scores.mean()
print(f"Mean accuracy across all folds: {mean_accuracy * 100:.2f}%")
std_accuracy = cv_scores.std()
print(f"Standard deviation of accuracy across folds: {std_accuracy * 100:.2f}%")
model.fit(X_train_vector, y_train)
y_pred = model.predict(X_test_vector)

#classification report
print(classification_report(y_test, y_pred))

#confusion matrix
conf_matrix = metrics.confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(conf_matrix)
# Plotting the confusion matrix
plt.figure(figsize=(5, 3))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', xticklabels=np.unique(y_test), yticklabels=np.unique(y_pred))
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.title('Confusion Matrix')
plt.show()

#Saving the model
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/sgd_model.pkl')
joblib.dump(vector, 'models/tfidf_vectorizer.pkl')
print("Model and vectorizer saved to 'models' directory.")
