import os
from flask import Flask, render_template, jsonify, request
import mysql.connector
from mysql.connector import Error
import requests

# ----- App setup -----
app = Flask(__name__, static_folder="static", template_folder="templates")

# ----- Database connection -----
def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "mood_journal"),
        port=int(os.getenv("DB_PORT", "3306")),
        autocommit=True,
    )

def init_db():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mood VARCHAR(50) NOT NULL,
                note TEXT,
                sentiment_label VARCHAR(50),
                sentiment_score FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.close()
        conn.close()
        print("Database ready ✅")
    except Error as e:
        print(f"DB init error: {e}")

# ----- Optional: Sentiment via Hugging Face -----
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_URL = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"

def analyze_sentiment(text: str):
    if not HF_API_TOKEN:
        return ("Neutral", 0.0)
    try:
        r = requests.post(HF_URL, headers={"Authorization": f"Bearer {HF_API_TOKEN}"}, json={"inputs": text}, timeout=10)
        r.raise_for_status()
        data = r.json()
        # Expected: [[{"label":"POSITIVE","score":0.99}, ...]]
        if isinstance(data, list) and data and isinstance(data[0], list) and data[0]:
            best = max(data[0], key=lambda x: x.get("score", 0))
            return (best.get("label", "Neutral"), round(float(best.get("score", 0)) * 100, 2))
    except Exception as e:
        print(f"Sentiment error: {e}")
    return ("Neutral", 0.0)

# ----- Routes -----
@app.route("/", methods=["GET"])
def index():
    # Renders templates/index.html
    return render_template("index.html")

@app.route("/api/health", methods=["GET"])
def health():
    # Quick health endpoint for Render
    return jsonify({"status": "ok"})

@app.route("/api/entries", methods=["GET"])
def list_entries():
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id, mood, note, sentiment_label, sentiment_score, created_at FROM journal_entries ORDER BY created_at DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(rows), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/entries", methods=["POST"])
def add_entry():
    data = request.get_json(silent=True) or {}
    mood = (data.get("mood") or "").strip()
    note = (data.get("note") or "").strip()

    if not mood:
        return jsonify({"error": "mood is required"}), 400

    label, score = analyze_sentiment(note)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO journal_entries (mood, note, sentiment_label, sentiment_score) VALUES (%s, %s, %s, %s)",
            (mood, note, label, score),
        )
        cur.close()
        conn.close()
        return jsonify({"message": "Entry added", "sentiment": {"label": label, "score": score}}), 201
    except Error as e:
        return jsonify({"error": str(e)}), 500

# ----- Entrypoint -----
if __name__ == "__main__":
    init_db()
    # Bind to $PORT for Render local testing fallback
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
