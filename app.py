from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

app = Flask(__name__)
CORS(app)

# ✅ Set your OpenAI API key correctly
openai.api_key = "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"

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message", "")

        if not user_input:
            return jsonify({"response": "I didn't receive any input. Please try again."})

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are an AI chatbot for Simon Fraser University."},
                      {"role": "user", "content": user_input}],
            max_tokens=200
        )

        return jsonify({"response": response["choices"][0]["message"]["content"].strip()})

    except Exception as e:
        print("Error:", str(e))  # Debugging in terminal
        return jsonify({"response": f"Error: {str(e)}"})  # Shows actual error in UI

if __name__ == "__main__":
    app.run(debug=True)
