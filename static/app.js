function loadReviewData() {
    return JSON.parse(localStorage.getItem("studybuddy_review")) || {};
}

function saveReviewData(data) {
    localStorage.setItem("studdybuddy_review", JSON.stringify(data));
}

function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}

function isDue(dateStr) {
    const today = new Date().toISOString().split("T")[0];
    return dateStr <= today;
}

const $ = (sel) => document.querySelector(sel);

// const useAI = document.getElementById("useAI");

const textBox= document.querySelector("#studyText");
const cardsBox = $("#cards");
const quizBox = $("#quiz");
const btnCards = $("#makeCards");
const btnQuiz = $("#makeQuiz");
const btnCheck = $("#checkQuiz");
const scoreEl = $("#quizScore");

function escapeHTML(str){
    return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function langClass(lang) {
    if (lang === "python") return "language-python";
    if (lang === "cpp") return "language-cpp";
    return "language-javascript";
}

async function postJSON(url, body){
    const resp = await fetch(url, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(body)
    });

           // if(!resp.ok) throw new Error('HTTP ${resp.status}')
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}



let lastQuestions = [];





document.getElementById("makeCards").onclick = async () => {
    const text = document.getElementById("studyText").value.trim();
    if (!text) return alert("Paste text first!");

    const useAI = document.getElementById("useAI").checked; // Check the box!
    const container = document.getElementById("cards");
    container.innerHTML = "<p>Generating...</p>";

    let flashcards = [];

    if (useAI) {
        try {
            // Actually call the API
            const data = await postJSON("/api/flashcards", { text: text, ai: true });
            flashcards = data.flashcards || [];
        } catch (e) {
            alert("Error: " + e.message);
            container.innerHTML = "";
            return;
        }
    } else {
        // Old local logic
        const lines = text.split("\n").filter(l => l.trim());
        flashcards = lines.map(line => {
            const parts = line.includes(":") ? line.split(":") : [line, "Tap to reveal"];
            return { front: parts[0].trim(), back: parts[1].trim() };
        });
    }

    container.innerHTML = ""; // Clear loading message

    // Render cards
    const saved = loadReviewData();
    flashcards.forEach((cardData) => {
        const front = cardData.front;
        const back = cardData.back;
        const nextReview = saved[front]?.nextReview || "not scheduled";

        const card = document.createElement("div");
        card.className = "flashcard";
        card.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front"><b>${escapeHTML(front)}</b></div>
                <div class="flashcard-back">${escapeHTML(back)}</div>
            </div>
            <div class="difficulty-row">
                <div class="diff-btn again">Again</div>
                <div class="diff-btn good">Good</div>
                <div class="diff-btn easy">Easy</div>
            </div>
            <div style="margin-top:8px; font-size:13px; color:#9bb0c9;">
                 Next review: ${nextReview}
            </div>
        `;
        
        card.querySelector(".flashcard-inner").onclick = () => card.classList.toggle("flipped");
        card.querySelector(".again").onclick = () => rateCard(front, 1);
        card.querySelector(".good").onclick = () => rateCard(front, 3);
        card.querySelector(".easy").onclick = () => rateCard(front, 7);
        
        container.appendChild(card);
    });
};

document.getElementById("makeQuiz").onclick = async () => {
    const text = document.getElementById("studyText").value.trim();
    if (!text) return alert("Paste text first!");

    const useAI = document.getElementById("useAI").checked; // Check the box
    const quizContainer = document.getElementById("quiz");
    quizContainer.innerHTML = "<p>Generating Quiz...</p>";

    let questions = [];

    if (useAI) {
        try {
            // Call the API
            const data = await postJSON("/api/quiz", { text: text, ai: true });
            questions = data.questions || [];
        } catch (e) {
            alert("Error: " + e.message);
            quizContainer.innerHTML = "";
            return;
        }
    } else {
        // Fallback: Old local logic (simple split)
        const lines = text.split("\n").filter(l => l.includes(":"));
        questions = lines.map(line => {
            const [q, a] = line.split(":").map(s => s.trim());
            return {
                question: q,
                options: shuffle([a, "Not " + a, "Incorrect option", "Another wrong one"]),
                answer: a
            };
        });
    }

    quizContainer.innerHTML = ""; // Clear loading text

    // Render Questions
    questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.dataset.correct = q.answer;

        // Create HTML for options
        const optionsHtml = q.options.map(opt => `
            <label>
                <input type="radio" name="q${index}" value="${escapeHTML(opt)}">
                ${escapeHTML(opt)}
            </label>
        `).join("");

        card.innerHTML = `
            <div class="quiz-question">${index + 1}. ${escapeHTML(q.question)}</div>
            <div class="quiz-options">${optionsHtml}</div>
            <div class="quiz-explanation" style="display:none;">
                <b>Explanation:</b> The correct answer is <span style="color:#93c5fd;">${escapeHTML(q.answer)}</span>.
            </div>
        `;
        quizContainer.appendChild(card);
    });
};


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


document.getElementById("checkQuiz").onclick = () => {
    const cards = document.querySelectorAll(".quiz-card");
    let score = 0;

    cards.forEach(card => {
        const chosen = card.querySelector("input:checked");
        const correct = card.dataset.correct;

        
        card.querySelectorAll("label").forEach(label => {
            label.classList.remove("correct-answer", "wrong-answer");
        });

        if (!chosen) return;

        const labels = card.querySelectorAll("label");
        labels.forEach(label => {
            if (label.textContent.trim() === correct) {
                label.classList.add("correct-answer");
            }
        });

        if (chosen.value === correct) {
            score++;
        } else {
            
            chosen.parentElement.classList.add("wrong-answer");
        }

        
        card.querySelector(".quiz-explanation").style.display = "block";
    });

    document.getElementById("quizScore").textContent = `Score: ${score}/${cards.length}`;
};


document.getElementById("retryQuiz").onclick = () => {
    const cards = document.querySelectorAll(".quiz-card");

    cards.forEach(card => {
        
        card.querySelectorAll("input").forEach(inp => (inp.checked = false));

        
        card.querySelectorAll("label").forEach(label => {
            label.classList.remove("correct-answer", "wrong-answer");
        });

        
        card.querySelector(".quiz-explanation").style.display = "none";
    });

    document.getElementById("quizScore").textContent = "";
};

function rateCard(cardId, days) {
    const saved = loadReviewData();

    saved[cardId] = {
        nextReview: addDays(days),
        lastReview: new Date().toISOString
    };

    saveReviewData(saved);
    updateReviewDue();
    alert(`Saved! Review again in ${days} day(s).`);
}

document.getElementById("explainCodeBtn").onclick = handleExplainCode;
document.getElementById("findBugBtn").onclick = handleFindBug;
document.getElementById("predictOutputBtn").onclick = handlePredictOutput;
// }

// --- CODE LAB HANDLERS ---

async function handleExplainCode() {
    const btn = document.getElementById("explainCodeBtn");
    const code = document.getElementById("codeInput").value.trim();
    const lang = document.getElementById("codeLanguage").value;

    if (!code) return alert("Paste some code first.");
    
    // 1. Show Loading State
    const originalText = btn.textContent;
    btn.textContent = "Thinking...";
    btn.disabled = true;

    try {
        const data = await postJSON("/api/explain_code", { code, lang });
        const cardsContainer = document.getElementById("cards");

        // 2. Clear previous results (optional, keeps it clean)
        // cardsContainer.innerHTML = ""; 

        data.flashcards.forEach(c => {
            const card = document.createElement("div");
            card.className = "flashcard";
            
            // Create the code block with syntax highlighting
            const codeHtml = `<pre><code class="${langClass(lang)}">${escapeHTML(code)}</code></pre>`;
            
            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <b>Explain this ${lang} code:</b>
                        ${codeHtml}
                    </div>
                    <div class="flashcard-back">${escapeHTML(c.back)}</div>
                </div>
                <div class="difficulty-row">
                    <div class="diff-btn again">Again</div>
                    <div class="diff-btn good">Good</div>
                    <div class="diff-btn easy">Easy</div>
                </div>
            `;
            
            // Flip logic
            card.querySelector(".flashcard-inner").onclick = () => card.classList.toggle("flipped");
            
            cardsContainer.appendChild(card);
            
            // Highlight code
            if(window.Prism) Prism.highlightAllUnder(card);

            // 3. SCROLL TO THE RESULT (Fixes the "It didn't work" feeling)
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        });

    } catch (e) {
        alert("Error calling AI: " + e.message);
    } finally {
        // 4. Reset Button
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleFindBug() {
    const btn = document.getElementById("findBugBtn");
    const code = document.getElementById("codeInput").value.trim();
    const lang = document.getElementById("codeLanguage").value;

    if (!code) return alert("Paste some code first.");

    btn.textContent = "Analyzing...";
    btn.disabled = true;

    try {
        const data = await postJSON("/api/find_bug", { code, lang });
        const cardsContainer = document.getElementById("cards");

        data.flashcards.forEach(c => {
            const card = document.createElement("div");
            card.className = "flashcard";
            const codeHtml = `<pre><code class="${langClass(lang)}">${escapeHTML(code)}</code></pre>`;

            card.innerHTML = `
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <b>Find the bug in this ${lang} code:</b>
                        ${codeHtml}
                    </div>
                    <div class="flashcard-back" style="white-space: pre-wrap;">${escapeHTML(c.back)}</div>
                </div>
                <div class="difficulty-row">
                    <div class="diff-btn again">Again</div>
                    <div class="diff-btn good">Good</div>
                    <div class="diff-btn easy">Easy</div>
                </div>
            `;
            card.querySelector(".flashcard-inner").onclick = () => card.classList.toggle("flipped");
            cardsContainer.appendChild(card);
            if(window.Prism) Prism.highlightAllUnder(card);
            
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    } catch (e) {
        alert("Error calling AI: " + e.message);
    } finally {
        btn.textContent = originalText; // Ensure 'originalText' is defined if you use it, or just string:
        btn.disabled = false;
        btn.textContent = "Create 'Find the bug' Card";
    }
}

async function handlePredictOutput() {
    const btn = document.getElementById("predictOutputBtn");
    const code = document.getElementById("codeInput").value.trim();
    const lang = document.getElementById("codeLanguage").value;

    if (!code) return alert("Paste some code first.");

    btn.textContent = "Generating Quiz...";
    btn.disabled = true;

    try {
        const data = await postJSON("/api/predict_output", { code, lang });
        const quizContainer = document.getElementById("quiz");

        data.questions.forEach((q, idx) => {
            const card = document.createElement("div");
            card.className = "quiz-card";
            card.dataset.correct = q.answer;
            const codeHtml = `<pre><code class="${langClass(lang)}">${escapeHTML(code)}</code></pre>`;

            // Unique ID for radio buttons to prevent conflicts
            const groupName = `ai_q_${Date.now()}_${idx}`;

            card.innerHTML = `
                <div class="quiz-question">What is the output of this ${lang} code?</div>
                <div class="quiz-code">${codeHtml}</div>
                <div class="quiz-options">
                    ${q.options.map(opt => `
                        <label>
                            <input type="radio" name="${groupName}" value="${escapeHTML(opt)}">
                            ${escapeHTML(opt)}
                        </label>
                    `).join("")}
                </div>
                <div class="quiz-explanation" style="display:none;">
                    <b>Explanation:</b> The correct output is <span style="color:#93c5fd;">${escapeHTML(q.answer)}</span>.
                </div>
            `;
            quizContainer.appendChild(card);
            if(window.Prism) Prism.highlightAllUnder(card);
            
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    } catch (e) {
        alert("Error calling AI: " + e.message);
    } finally {
        btn.textContent = "Create 'Predict the output' Quiz";
        btn.disabled = false;
    }
}

function updateReviewDue() {
    const saved = loadReviewData();
    const reviewContainer = document.getElementById("reviewDue");
    reviewContainer.innerHTML = "";

    const dueCards = Object.entries(saved)
        .filter(([front, data]) => isDue(data.nextReview));

    if (dueCards.length === 0){
        reviewContainer.innerHTML = "<p>No cards due today</p>"
        return;
    }

    dueCards.forEach(([front, data]) => {
        const card = document.createElement("div");
        card.className = "flashcard";

        card.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front"><b>${front}</b></div>
                <div class="flashcard-back">Tap to reveal</div>
            </div>
            <div style="margin-top:8px; font-size:13px; color:#9bb0c9;">
                Due: ${data.nextReview}
            </div>
        `;

        card.querySelector(".flashcard-inner").onclick = () =>
            card.classList.toggle("flipped");

        reviewContainer.appendChild(card);
    });
}