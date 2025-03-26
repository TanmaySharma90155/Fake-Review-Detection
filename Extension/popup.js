document.getElementById('predictButton').addEventListener('click', async () => {
    const reviewText = document.getElementById('reviewText').value;
    const resultDiv = document.getElementById('result');

    if (!reviewText) {
        resultDiv.innerText = "Please enter a review.";
        return;
    }

    resultDiv.innerText = "Checking...";

    try {
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: reviewText })
        });

        const data = await response.json();

        if (data.error) {
            resultDiv.innerText = `Error: ${data.error}`;
        } else {
            resultDiv.innerText = `Result: ${data.result} (${data.probability_real.toFixed(2)}% real)\nSentiment: ${data.sentiment}`;
        }
    } catch (error) {
        resultDiv.innerText = `Error: Could not connect to server.`;
    }
});
