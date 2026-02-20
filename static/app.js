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


// Make Quiz Logic 
document.getElementById("makeQuiz").onclick = async () => {
    // Properly define the input text and target container
    const text = $("#studyText").value.trim();
    const container = $("#quiz");

    // Validate input
    if (!text) return alert("Paste text first!");

    // Start loading state
    toggleLoading("makeQuiz", true, "Make Quiz");
    
    try {
        // Fetch the data from your Flask API
        const data = await postJSON("/api/quiz", { text });
        container.innerHTML = ""; // Clear old content
        
        if (!data.questions || data.questions.length === 0) {
            container.innerHTML = "<p>No questions generated. Try more text.</p>";
            return;
        }

        data.questions.forEach((q, qIdx) => {
            const qDiv = document.createElement("div");
            qDiv.className = "quiz-card";
            qDiv.style.marginBottom = "20px";
            
            const rawHtml = `
            <p><b>Q${qIdx + 1}: ${escapeHTML(q.question)}</b></p>
            <div class="quiz-options">
                ${q.options.map(opt => `
                    <label style="display:block; margin: 5px 0;">
                        <input type="radio" name="q${qIdx}" value="${escapeHTML(opt)}"> 
                        ${escapeHTML(opt)}
                    </label>
                `).join('')}
            </div>
            <button class="check-btn">Check Answer</button> 
            <div class="quiz-feedback" style="display:none; margin-top:10px; padding:10px; border-radius:8px; background: rgba(255,255,255,0.1);">
                <p><b>Correct Answer:</b> ${escapeHTML(q.answer)}</p>
                <p><i>${escapeHTML(q.explanation || "")}</i></p>
            </div>`;
            
            //  Security: Sanitize and inject
            qDiv.innerHTML = DOMPurify.sanitize(rawHtml);
            container.appendChild(qDiv);
        });
        
        container.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
        console.error("Quiz Error:", err);
        alert("Failed to create quiz. Check console.");
    } finally { 
        //  Reset loading state
        toggleLoading("makeQuiz", false, "Make Quiz"); 
    }
};

// Make Flashcards Logic 
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
            const cleanBack = DOMPurify.sanitize(marked.parse(c.back));
            const cleanFront = DOMPurify.sanitize(c.front);
            card.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front"><b>${cleanFront}</b></div>
                <div class="flashcard-back">${cleanBack}</div>
            </div>`;

            card.onclick = () => card.classList.toggle("flipped");
            container.appendChild(card);
        });
    } finally { toggleLoading("makeCards", false, "Make Flashcards"); }
};

// Explain Code Logic
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
            const cleanBack = DOMPurify.sanitize(marked.parse(c.back));
            const cleanFront = DOMPurify.sanitize(c.front);
            card.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front"><b>${cleanFront}</b></div>
                <div class="flashcard-back">${cleanBack}</div>
            </div>`;

            card.onclick = () => card.classList.toggle("flipped");
            $("#cards").prepend(card);
        });
        $("#cards").scrollIntoView({ behavior: "smooth" });
    } finally { toggleLoading("explainCodeBtn", false, "Create 'Explain code' Card"); }
};

//  Find Bug Logic
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
            const cleanFront = DOMPurify.sanitize(c.front);
            const cleanBack = DOMPurify.sanitize(marked.parse(c.back));
            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front"><b>${cleanFront}</b></div>
                    <div class="flashcard-back">${cleanBack}</div>
                </div>`;
            card.onclick = () => card.classList.toggle("flipped");
            $("#cards").prepend(card);
        });
    } finally { toggleLoading("findBugBtn", false, "Create 'Find the bug' Card"); }
};

document.getElementById("quiz").addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("check-btn")) {
        const btn = e.target;
        const feedback = btn.nextElementSibling;
        
        // Show the feedback div
        if (feedback) {
            feedback.style.display = 'block';
        }
        // Hide the button
        btn.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const tBtn = document.getElementById("themeToggle");
    if(tBtn) tBtn.onclick = toggleTheme;
});