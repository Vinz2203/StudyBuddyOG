
import os, json, re
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
#hello how are you
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

# --- AI HELPER FUNCTIONS (The "Brain") ---

def ai_build_flashcards(text: str, max_cards: int = 12):
    prompt = f"""
You are StudyBuddy. Create up to {max_cards} flashcards from the text.
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
    if not match: return []
    try:
        data = json.loads(match.group(0))
    except: return []

    cards = data.get("flashcards") if isinstance(data, dict) else data
    if not isinstance(cards, list): return []

    cleaned = []
    for c in cards:
        f = (c.get("front") or "").strip()
        b = (c.get("back") or "").strip()
        if f and b:
            cleaned.append({"front": f, "back": b})
    return cleaned

def ai_build_quiz(text: str, num_qs: int = 5):
    prompt = f"""
You are StudyBuddy. Create {num_qs} multiple-choice questions from the text.
Return ONLY valid JSON: {{ "questions": [ {{ "question": "...", "options": ["A","B","C","D"], "answer": "A" }} ] }}
TEXT:
{text}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    if not match: return []
    try:
        data = json.loads(match.group(0))
    except: return []

    items = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(items, list): return []

    cleaned = []
    for q in items:
        qtext = (q.get("question") or "").strip()
        opts  = q.get("options") or []
        ans   = (q.get("answer") or "").strip()
        if qtext and isinstance(opts, list) and ans:
            cleaned.append({"question": qtext, "options": opts, "answer": ans})
    return cleaned

def ai_explain_code(code: str, lang: str):
    prompt = f"""
You are StudyBuddy. Explain this {lang} code clearly.
Return ONLY valid JSON: {{ "flashcards": [ {{ "front": "Explain this code", "back": "..." }} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    if not match: return []
    try:
        data = json.loads(match.group(0))
    except: return []

    cards = data.get("flashcards") if isinstance(data, dict) else data
    if not isinstance(cards, list): return []

    # Format specifically for the frontend
    if cards:
        c = cards[0]
        back = (c.get("back") or "").strip()
        if back:
            return [{"front": f"Explain this {lang} code", "back": back}]
    return []

def ai_find_bug(code: str, lang: str):
    prompt = f"""
You are StudyBuddy. Find the bug in this {lang} code.
Return ONLY valid JSON: {{ "flashcards": [ {{ "front": "Find the bug", "back": "Bug: ...\\nFix: ..." }} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    if not match: return []
    try:
        data = json.loads(match.group(0))
    except: return []

    cards = data.get("flashcards") if isinstance(data, dict) else data
    if not isinstance(cards, list): return []

    if cards:
        c = cards[0]
        back = (c.get("back") or "").strip()
        if back:
            return [{"front": "Find the bug", "back": back}]
    return []

def ai_predict_output(code: str, lang: str):
    prompt = f"""
You are StudyBuddy. Create one multiple-choice question asking for the output of this {lang} code.
Return ONLY valid JSON: {{ "questions": [ {{ "question": "What is the output?", "options": ["A","B","C","D"], "answer": "A" }} ] }}
CODE:
{code}
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = resp.choices[0].message.content or ""
    
    match = re.search(r"\{.*\}|\[.*\]", raw, flags=re.DOTALL)
    if not match: return []
    try:
        data = json.loads(match.group(0))
    except: return []

    items = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(items, list): return []

    if items:
        q = items[0]
        qtext = (q.get("question") or "What is the output?").strip()
        opts  = q.get("options") or []
        ans   = (q.get("answer") or "").strip()
        if isinstance(opts, list) and ans:
            return [{"question": qtext, "options": opts, "answer": ans}]
    return []


# --- API ROUTES (The "Traffic Controllers") ---

@app.post("/api/flashcards")
def api_flashcards():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    use_ai = bool(data.get("ai"))

    if not text: return jsonify({"flashcards": []})

    if use_ai:
        try:
            cards = ai_build_flashcards(text)
            return jsonify({"flashcards": cards})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        # Fallback local logic
        parts = text.splitlines()
        cards = [{"front": p[:50], "back": p} for p in parts if p.strip()]
        return jsonify({"flashcards": cards})

@app.post("/api/quiz")
def api_quiz():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    use_ai = bool(data.get("ai"))

    if not text: return jsonify({"questions": []})

    if use_ai:
        try:
            questions = ai_build_quiz(text)
            return jsonify({"questions": questions})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"questions": []})

@app.post("/api/explain_code")
def route_explain_code():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    
    if not code: return jsonify({"flashcards": []})
    try:
        return jsonify({"flashcards": ai_explain_code(code, lang)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/find_bug")
def route_find_bug():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    
    if not code: return jsonify({"flashcards": []})
    try:
        return jsonify({"flashcards": ai_find_bug(code, lang)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/predict_output")
def route_predict_output():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    lang = (data.get("lang") or "javascript").strip()
    
    if not code: return jsonify({"questions": []})
    try:
        return jsonify({"questions": ai_predict_output(code, lang)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- START SERVER (Must be at the very bottom) ---
if __name__ == "__main__":
    app.run(debug=True)