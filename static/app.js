const $ = (sel) => document.querySelector(sel);

// --- Theme Management ---
function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sb_theme", next);
}
const savedTheme = localStorage.getItem("sb_theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

// --- Utilities ---
function toggleLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? "<span>⌛ Thinking...</span>" : originalText;
}

function escapeHTML(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

async function postJSON(url, body) {
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return resp.json();
}

// --- Make Quiz Logic ---
document.getElementById("makeQuiz").onclick = async () => {
    const text = $("#studyText").value.trim();
    if (!text) return alert("Paste text first!");
    toggleLoading("makeQuiz", true, "Make Quiz");
    const container = $("#quiz");
    container.innerHTML = "";
    try {
        const data = await postJSON("/api/quiz", { text });
        data.questions.forEach((q, qIdx) => {
            const qDiv = document.createElement("div");
            qDiv.className = "quiz-card";
            
            // SANITIZE BOTH THE QUESTION AND EXPLANATION
            const cleanQ = DOMPurify.sanitize(q.question);
            const cleanEx = DOMPurify.sanitize(q.explanation);
        
            qDiv.innerHTML = `
                <p><b>Q${qIdx+1}: ${cleanQ}</b></p>
                <div class="quiz-options">
                    ${q.options.map(opt => `<label><input type="radio" name="q${qIdx}" value="${escapeHTML(opt)}"> ${escapeHTML(opt)}</label>`).join('')}
                </div>
                <button onclick="this.nextElementSibling.style.display='block'; this.style.display='none'">Check Answer</button>
                <div class="quiz-feedback" style="display:none; margin-top:10px;">
                    <p><b>Answer:</b> ${escapeHTML(q.answer)}</p>
                    <p><i>${cleanEx}</i></p>
                </div>`;
            container.appendChild(qDiv);
        });
    } finally { toggleLoading("makeQuiz", false, "Make Quiz"); }
};

// --- Make Flashcards Logic ---
document.getElementById("makeCards").onclick = async () => {
    const text = $("#studyText").value.trim();
    if (!text) return alert("Paste text first!");
    toggleLoading("makeCards", true, "Make Flashcards");
    try {
        const data = await postJSON("/api/flashcards", { text, ai: $("#useAI").checked });
        const container = $("#cards");
        container.innerHTML = "";
        data.flashcards.forEach(c => {
            const card = document.createElement("div");
            card.className = "flashcard";
            
            // 1. Parse Markdown
            const rawHtml = marked.parse(c.back);
            // 2. WASH the HTML (Crucial security step)
            const cleanHtml = DOMPurify.sanitize(rawHtml);
            
            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front"><b>${escapeHTML(c.front)}</b></div>
                    <div class="flashcard-back">${cleanHtml}</div>
                </div>`;
            card.onclick = () => card.classList.toggle("flipped");
            $("#cards").prepend(card);
        });
    } finally { toggleLoading("makeCards", false, "Make Flashcards"); }
};

// --- Explain Code Logic (FIXED) ---
document.getElementById("explainCodeBtn").onclick = async () => {
    const code = $("#codeInput").value.trim();
    const lang = $("#codeLanguage").value;
    if (!code) return alert("Paste code first!");
    toggleLoading("explainCodeBtn", true, "Analyzing code...");
    try {
        const data = await postJSON("/api/explain_code", { code, lang });
        data.flashcards.forEach(c => {
            const card = document.createElement("div");
            card.className = "flashcard";
            
            // 1. Parse Markdown
            const rawHtml = marked.parse(c.back);
            // 2. WASH the HTML (Crucial security step)
            const cleanHtml = DOMPurify.sanitize(rawHtml);
            
            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front"><b>${escapeHTML(c.front)}</b></div>
                    <div class="flashcard-back">${cleanHtml}</div>
                </div>`;
            card.onclick = () => card.classList.toggle("flipped");
            $("#cards").prepend(card);
        });
        $("#cards").scrollIntoView({ behavior: "smooth" });
    } finally { toggleLoading("explainCodeBtn", false, "Create 'Explain code' Card"); }
};

// --- Find Bug Logic ---
document.getElementById("findBugBtn").onclick = async () => {
    const code = $("#codeInput").value.trim();
    const lang = $("#codeLanguage").value;
    if (!code) return alert("Paste code first!");
    toggleLoading("findBugBtn", true, "Hunting bugs...");
    try {
        const data = await postJSON("/api/find_bug", { code, lang });
        data.flashcards.forEach(c => {
            const card = document.createElement("div");
            card.className = "flashcard";
            //const cleanBack = marked.parse(c.back);
            const rawHtml = marked.parse(c.back);
            const cleanHtml = DOMPurify.sanitize(rawHtml);
            card.innerHTML = `<div class="flashcard-inner">
                <div class="flashcard-front"><b>🚩 Bug Hunt (${lang})</b></div>
                <div class="flashcard-back">${cleanHtml}</div>
            </div>`;
            card.onclick = () => card.classList.toggle("flipped");
            $("#cards").prepend(card);
        });
    } finally { toggleLoading("findBugBtn", false, "Create 'Find the bug' Card"); }
};

document.addEventListener('DOMContentLoaded', () => {
    const tBtn = document.getElementById("themeToggle");
    if(tBtn) tBtn.onclick = toggleTheme;
});