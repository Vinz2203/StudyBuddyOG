import os, json, re
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

# 1. Load Keys
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY", "").strip()
app = Flask(__name__)
client = OpenAI(api_key=api_key)

if not api_key:
    print("❌ ERROR: OPENAI_API_KEY not found in .env file!")
else:
    print("✅ API Key successfully loaded.")

@app.get("/")
def home():
    return render_template("index.html")

# --- UPDATED AI HELPER FUNCTIONS (The "Brain") ---

def ai_build_flashcards(text: str, max_cards: int = 12):
    prompt = f"""
You are a Senior Software Engineering Mentor. Create up to {max_cards} high-yield flashcards from the text.
Focus on "Why" things work, common pitfalls, and technical accuracy.
Return ONLY valid JSON: {{ "flashcards": [ {{"front": "...", "back": "..."}} ] }}
TEXT:
{text}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    return json.loads(match.group(0)) if match else {"flashcards": []}

def ai_build_quiz(text: str, max_q: int = 5):
    prompt = f"""
You are a Technical Interviewer. Create {max_q} challenging multiple-choice questions.
Focus on core concepts and potential engineering misunderstandings.
Return ONLY valid JSON: {{ "questions": [ {{"question": "...", "options": ["...", "..."], "answer": "...", "explanation": "..."}} ] }}
TEXT:
{text}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    return json.loads(match.group(0)) if match else {"questions": []}

def ai_explain_code(code: str, lang: str):
    prompt = f"""
You are a Computer Science Professor. Explain this {lang} code by breaking it down into deep-dive flashcards.
Focus on "How it works" and "Why it's used".
Return ONLY valid JSON: {{ "flashcards": [ {{"front": "Concept Name", "back": "Detailed Explanation..."}} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    return json.loads(match.group(0)) if match else {"flashcards": []}

def ai_find_bug(code: str, lang: str):
    prompt = f"""
You are a Senior Software Architect. Find the logic bug or security flaw in this {lang} code.
Identify the issue, provide the corrected fix, and a "Senior Tip".
Return ONLY valid JSON: {{ "flashcards": [ {{"front": "Bug Hunting", "back": "### 🚩 THE BUG\\n...\\n\\n### ✅ THE FIX\\n...\\n\\n### 💡 SENIOR TIP\\n..."}} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    return json.loads(match.group(0)) if match else {"flashcards": []}

def ai_predict_output(code: str, lang: str):
    prompt = f"""
Create a "Predict the Output" challenge for this {lang} code. Include tricky edge cases.
Return ONLY valid JSON: {{ "questions": [ {{"question": "What is the output?", "options": [], "answer": "...", "explanation": "Step-by-step logic..."}} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    return json.loads(match.group(0)) if match else {"questions": []}

# --- ROUTES ---

@app.post("/api/flashcards")
def route_flashcards():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    use_ai = data.get("ai") is True
    if not text: return jsonify({"flashcards": []})
    if use_ai:
        try: return jsonify(ai_build_flashcards(text))
        except Exception as e: return jsonify({"error": str(e)}), 500
    else:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        cards = [{"front": l, "back": "Manual card"} for l in lines]
        return jsonify({"flashcards": cards})

@app.post("/api/quiz")
def route_quiz():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text: return jsonify({"questions": []})
    try:
        # Calls the AI quiz builder
        return jsonify(ai_build_quiz(text))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/explain_code")
def route_explain_code():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    if not code: return jsonify({"flashcards": []})
    try: 
        return jsonify(ai_explain_code(code, lang)) # Check that this returns a list of flashcards
    except Exception as e: 
        return jsonify({"error": str(e)}), 500

@app.post("/api/find_bug")
def route_find_bug():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    if not code: return jsonify({"flashcards": []})
    try: return jsonify(ai_find_bug(code, lang))
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.post("/api/predict_output")
def route_predict_output():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    if not code: return jsonify({"questions": []})
    try: return jsonify(ai_predict_output(code, lang))
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)