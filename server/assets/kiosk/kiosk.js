/* Runs on Safari 12 (iOS 12): no optional chaining, nullish coalescing, Object.fromEntries, or Array.prototype.at. */
(function () {
  "use strict";

  const REFRESH_MS = 60 * 1000;
  const RELOAD_AFTER_FAILURES = 5;
  const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

  const state = {
    data: window.KIOSK_DATA || null,
    who: window.KIOSK_WHO || "",
    quizSetting: String(window.KIOSK_QUIZ || "").trim().toLowerCase(),
    quiz: null,
    working: {},
    celebrating: false,
    failures: 0,
    lastLoaded: Date.now(),
  };

  const app = document.getElementById("app");

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name) {
    const icons = (state.data && state.data.icons) || {};
    return icons[name] || "";
  }

  function hexToRgba(hex, alpha) {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!match)
      return `rgba(6, 182, 212, ${alpha})`;
    const value = Number.parseInt(match[1], 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  function api(method, url, body) {
    return fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then((response) => {
      if (!response.ok) {
        const error = new Error(`Request failed (${response.status})`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    });
  }

  function findPerson(personId) {
    const people = (state.data && state.data.people) || [];
    for (let i = 0; i < people.length; i++) {
      if (people[i].id === personId)
        return people[i];
    }
    return null;
  }

  /* ---------- Rendering ---------- */

  function renderClock() {
    const now = new Date();
    const clock = document.getElementById("clock");
    if (clock)
      clock.textContent = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function renderStatus() {
    const status = document.getElementById("status");
    if (!status)
      return;
    if (state.failures > 0) {
      status.className = "status offline";
      status.textContent = "Can't reach SkyLite, retrying…";
    }
    else {
      status.className = "status";
      status.textContent = `Updated ${new Date(state.lastLoaded).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
  }

  function renderEvents(events) {
    if (!events.length)
      return "<div class=\"events\"><span class=\"events-empty\">No events today</span></div>";
    return `<div class="events">${events.map((event) => {
      const meta = [];
      if (event.people && event.people.length)
        meta.push(event.people.join(", "));
      if (event.location)
        meta.push(event.location);
      return `<div class="event">`
        + `<div class="event-time">${esc(event.time)}</div>`
        + `<div class="event-title">${esc(event.title)}</div>${
          meta.length ? `<div class="event-meta">${esc(meta.join(" · "))}</div>` : ""
        }</div>`;
    }).join("")}</div>`;
  }

  function renderAvatar(person) {
    let inner = esc(person.name.charAt(0).toUpperCase());
    if (person.avatar && /^(?:https?:|data:image\/|\/)/.test(person.avatar))
      inner += `<img src="${esc(person.avatar)}" alt="" onerror="this.style.display='none'">`;
    return `<div class="avatar" style="background:${esc(person.color)}">${inner}</div>`;
  }

  function renderTile(person, item) {
    const classes = `tile${item.completed ? " done" : ""}${state.working[item.id] ? " working" : ""}${item.justDone ? " pop" : ""}`;
    return `<button type="button" class="${classes}" data-action="complete" data-person="${esc(person.id)}" data-id="${esc(item.id)}"${item.completed ? " disabled" : ""}>${
      item.completed ? `<span class="tile-check">${icon("i-lucide-check")}</span>` : ""
    }${item.points ? `<span class="tile-points">+${esc(item.points)}</span>` : ""
    }<div class="tile-icon" style="background:${hexToRgba(person.color, 0.15)};color:${esc(person.color)}">${icon(item.icon)}</div>`
    + `<div class="tile-title">${esc(item.title)}</div>`
    + `</button>`;
  }

  function renderRoutine(person, routine) {
    const done = routine.steps.filter(step => step.done).length;
    return `<div class="routine${routine.completed ? " done" : ""}">`
      + `<div class="routine-head"><span class="ic">${icon(routine.icon)}</span>`
      + `<span class="routine-name">${esc(routine.name)}</span>`
      + `<span class="routine-count">${routine.completed ? "🎉 Done" : `${done}/${routine.steps.length}`}</span></div>${
        routine.steps.map((step) => {
          return `<button type="button" class="step${step.done ? " done" : ""}" data-action="step" data-person="${esc(person.id)}" data-routine="${esc(routine.id)}" data-id="${esc(step.id)}">`
            + `<span class="step-box">${step.done ? icon("i-lucide-check") : ""}</span>`
            + `<span class="step-title">${esc(step.title)}</span>`
            + `</button>`;
        }).join("")
      }</div>`;
  }

  function renderPerson(person) {
    const total = person.items.length + person.routines.length;
    const finished = person.items.filter(item => item.completed).length
      + person.routines.filter(routine => routine.completed).length;
    const percent = total ? Math.round((finished / total) * 100) : 0;

    let html = `<div class="person" style="border-top-color:${esc(person.color)}">`
      + `<div class="person-head">${renderAvatar(person)
      }<div><div class="person-name">${esc(person.name)}</div>`
      + `<div class="points">`
      + `<span class="pill pill-today" id="today-${esc(person.id)}"><span class="ic">${icon("i-lucide-star")}</span>${esc(person.pointsToday)} today</span>`
      + `<span class="pill pill-total" id="total-${esc(person.id)}"><span class="ic">${icon("i-lucide-trophy")}</span>${esc(person.points)}</span>`
      + `</div></div></div>`;

    if (total) {
      html += `<div class="progress"><div class="progress-bar" style="width:${percent}%;background:${esc(person.color)}"></div></div>`
        + `<div class="progress-label">${finished} of ${total} done</div>`;
    }

    if (person.meals.length) {
      html += `<div class="meals">${person.meals.map((meal) => {
        return `<div class="meal"><span class="ic">${icon(meal.icon)}</span><span><b>${esc(meal.dayLabel === "Today" ? meal.name : `${meal.dayLabel} ${meal.name.toLowerCase()}`)}:</b>${esc(meal.text)}</span></div>`;
      }).join("")}</div>`;
    }

    if (total && finished === total)
      html += "<div class=\"all-done\"><span class=\"big\">🏆</span>All done for today!</div>";

    if (person.routines.length) {
      html += `<div class="section-title">Routines</div>${
        person.routines.map(routine => renderRoutine(person, routine)).join("")}`;
    }

    if (person.items.length) {
      html += `<div class="section-title">Chores &amp; to-dos</div><div class="tiles">${
        person.items.map(item => renderTile(person, item)).join("")
      }</div>`;
    }
    else if (!person.routines.length) {
      html += "<div class=\"nothing\">Nothing on the list today</div>";
    }

    return `${html}</div>`;
  }

  function render() {
    const data = state.data;
    if (!data) {
      app.innerHTML = "<div class=\"loading\">Loading…</div>";
      return;
    }
    const columns = Math.max(1, Math.min(data.people.length, window.innerWidth < 700 ? 2 : 4));
    app.innerHTML = `<div class="topbar">`
      + `<div><div class="clock" id="clock"></div><div class="date">${esc(data.dateLabel)}</div></div>`
      + `<div><div class="brand"><span class="cloud"></span>SkyLite</div><div class="status" id="status"></div></div>`
      + `</div>${
        renderEvents(data.events || [])
      }${data.people.length
        ? `<div class="people" style="grid-template-columns:repeat(${columns}, minmax(0, 1fr))">${data.people.map(renderPerson).join("")}</div>`
        : "<div class=\"error-box\">No chores or routines for anyone today</div>"}`;
    renderClock();
    renderStatus();
  }

  /* ---------- Celebration ---------- */

  let audioContext = null;

  function playChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass)
        return;
      if (!audioContext)
        audioContext = new AudioContextClass();
      const start = audioContext.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.25, start + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.12 + 0.35);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start + index * 0.12);
        oscillator.stop(start + index * 0.12 + 0.4);
      });
    }
    catch {
      /* Sound is optional. */
    }
  }

  function celebrate(name, points) {
    state.celebrating = true;
    playChime();

    const layer = document.getElementById("celebration");
    let confetti = "";
    for (let i = 0; i < 36; i++) {
      confetti += `<span class="confetti" style="left:${Math.round(Math.random() * 100)}%;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]
      };-webkit-animation-delay:${(Math.random() * 0.6).toFixed(2)}s;animation-delay:${(Math.random() * 0.6).toFixed(2)}s"></span>`;
    }
    layer.innerHTML = `<div class="celebrate-wrap" id="celebrate-wrap">`
      + `<div class="celebrate-card">`
      + `<div class="celebrate-star">${icon("i-lucide-star")}</div>`
      + `<div class="celebrate-title">🎉 Great Job! 🎉</div>`
      + `<div class="celebrate-name">${esc(name)}</div>${
        points > 0
          ? `<div class="celebrate-points"><span class="ic">${icon("i-lucide-trophy")}</span><span><small>You earned</small><strong>+${esc(points)} ${points === 1 ? "point" : "points"}!</strong></span></div>`
          : ""
      }<span class="float float-1">⭐</span><span class="float float-2">🌟</span><span class="float float-3">✨</span>`
      + `<span class="float float-4">💫</span><span class="float float-5">🎈</span><span class="float float-6">🎊</span>`
      + `</div></div>${confetti}`;

    let finished = false;
    function close() {
      if (finished)
        return;
      finished = true;
      const wrap = document.getElementById("celebrate-wrap");
      if (wrap)
        wrap.className += " leaving";
      setTimeout(() => {
        layer.innerHTML = "";
        state.celebrating = false;
      }, 300);
    }
    layer.onclick = close;
    setTimeout(close, 3000);
  }

  function bumpPoints(personId) {
    ["today-", "total-"].forEach((prefix) => {
      const pill = document.getElementById(prefix + personId);
      if (pill)
        pill.className += " bump";
    });
  }

  /* ---------- Actions ---------- */

  function findItem(person, itemId) {
    return person ? person.items.filter(candidate => candidate.id === itemId)[0] : null;
  }

  function isQuizOn(person) {
    const setting = state.quizSetting;
    if (setting === "off" || setting === "none" || setting === "no")
      return false;
    if (!setting)
      return true;
    return setting.split(",").map(name => name.trim()).includes(person.name.toLowerCase());
  }

  /** Saves the completion; rejects with the request error so callers can react (e.g. a wrong PIN). */
  function submitCompletion(personId, itemId, extra) {
    const person = findPerson(personId);
    const item = findItem(person, itemId);
    if (!item || item.completed || state.working[itemId])
      return Promise.resolve();

    const payload = { todoId: itemId };
    Object.keys(extra || {}).forEach((key) => {
      payload[key] = extra[key];
    });

    state.working[itemId] = true;
    render();
    return api("POST", "/api/kiosk/complete", payload)
      .then((result) => {
        delete state.working[itemId];
        item.completed = true;
        item.justDone = true;
        if (result.points !== null)
          person.points = result.points;
        if (result.pointsToday !== null)
          person.pointsToday = result.pointsToday;
        render();
        bumpPoints(personId);
        if (!result.alreadyDone)
          celebrate(item.title, result.pointsAwarded);
        item.justDone = false;
      }, (error) => {
        delete state.working[itemId];
        render();
        throw error;
      });
  }

  function completeItem(personId, itemId) {
    const person = findPerson(personId);
    const item = findItem(person, itemId);
    if (!item || item.completed || state.working[itemId])
      return;
    if (isQuizOn(person)) {
      openQuiz(person, item);
      return;
    }
    submitCompletion(personId, itemId, {}).catch((error) => {
      showError(`Couldn't save that. Try again. ${error.message}`);
    });
  }

  /* ---------- Quiz before a chore counts ---------- */

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function repeat(emoji, count) {
    let out = "";
    for (let i = 0; i < count; i++)
      out += emoji;
    return out;
  }

  function numberOptions(answer, max) {
    const options = [answer];
    const nearby = shuffle([answer - 2, answer - 1, answer + 1, answer + 2, answer + 3, answer - 3]);
    for (let i = 0; i < nearby.length && options.length < 4; i++) {
      if (nearby[i] >= 0 && nearby[i] <= max && !options.includes(nearby[i]))
        options.push(nearby[i]);
    }
    while (options.length < 4) {
      const extra = randomInt(0, max);
      if (!options.includes(extra))
        options.push(extra);
    }
    return shuffle(options).map(String);
  }

  const OBJECTS = ["🍎", "⭐", "🎈", "🐟", "🌸", "🍓", "🚗", "🐞", "⚽", "🧁"];
  const FOODS = [["🍪", "cookies"], ["🍓", "strawberries"], ["🍇", "grapes"], ["🧁", "cupcakes"]];
  const HELPERS = ["Mom", "Dad", "Grandma", "Grandpa", "a friend"];
  const GROUPS = [
    { name: "fruit", items: ["🍎", "🍌", "🍇", "🍓", "🍊", "🍉"] },
    { name: "animal", items: ["🐶", "🐱", "🐰", "🐮", "🐷", "🦁"] },
    { name: "vehicle", items: ["🚗", "🚌", "🚲", "✈️", "🚂", "🚀"] },
    { name: "clothes", items: ["👕", "👖", "🧦", "👗", "🧢", "👟"] },
  ];

  function makeQuestion(name) {
    const kind = pick(["add", "subtract", "story-add", "story-subtract", "count", "bigger", "next-number", "pattern", "odd-one"]);
    let a;
    let b;
    let emoji;

    if (kind === "add") {
      a = randomInt(1, 6);
      b = randomInt(1, 10 - a);
      emoji = pick(OBJECTS);
      return { prompt: `${a} + ${b} = ?`, speak: `What is ${a} plus ${b}?`, visual: `${repeat(emoji, a)} ➕ ${repeat(emoji, b)}`, options: numberOptions(a + b, 12), answer: String(a + b) };
    }
    if (kind === "subtract") {
      a = randomInt(3, 10);
      b = randomInt(1, a - 1);
      return { prompt: `${a} − ${b} = ?`, speak: `What is ${a} minus ${b}?`, visual: "", options: numberOptions(a - b, 10), answer: String(a - b) };
    }
    if (kind === "story-add") {
      a = randomInt(1, 5);
      b = randomInt(1, 5);
      emoji = pick(["🎈", "⭐", "🌸", "🐟"]);
      const helper = pick(HELPERS);
      const text = `${name} has ${a} ${emoji}. ${helper.charAt(0).toUpperCase()}${helper.slice(1)} gives ${b} more. How many now?`;
      return { prompt: text, speak: text.replace(emoji, emoji === "🎈" ? "balloons" : emoji === "⭐" ? "stars" : emoji === "🌸" ? "flowers" : "fish"), visual: "", options: numberOptions(a + b, 12), answer: String(a + b) };
    }
    if (kind === "story-subtract") {
      a = randomInt(3, 9);
      b = randomInt(1, a - 1);
      const food = pick(FOODS);
      const text = `There are ${a} ${food[0]} on the plate. ${name} eats ${b}. How many are left?`;
      return { prompt: text, speak: text.replace(food[0], food[1]), visual: repeat(food[0], a), options: numberOptions(a - b, 10), answer: String(a - b) };
    }
    if (kind === "count") {
      a = randomInt(3, 10);
      emoji = pick(OBJECTS);
      return { prompt: `How many ${emoji}?`, speak: "How many do you see?", visual: repeat(emoji, a), options: numberOptions(a, 12), answer: String(a) };
    }
    if (kind === "bigger") {
      const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).slice(0, 4);
      const smaller = Math.random() < 0.4;
      const answer = smaller ? Math.min.apply(null, numbers) : Math.max.apply(null, numbers);
      const word = smaller ? "smallest" : "biggest";
      return { prompt: `Which number is the ${word}?`, speak: `Which number is the ${word}?`, visual: "", options: numbers.map(String), answer: String(answer) };
    }
    if (kind === "next-number") {
      const step = Math.random() < 0.3 ? 2 : 1;
      a = randomInt(step === 2 ? 0 : 1, step === 2 ? 6 : 15) * (step === 2 ? 2 : 1);
      const sequence = [a, a + step, a + step * 2];
      return { prompt: `${sequence.join(", ")}, ?`, speak: `What number comes next? ${sequence.join(", ")}`, visual: "", options: numberOptions(a + step * 3, 24), answer: String(a + step * 3) };
    }
    if (kind === "pattern") {
      const shapes = shuffle(["🔴", "🔵", "🟡", "🟢", "🟣", "⭐", "❤️"]);
      const unit = Math.random() < 0.6 ? [shapes[0], shapes[1]] : [shapes[0], shapes[1], shapes[2]];
      const shown = [];
      for (let i = 0; i < unit.length * 2 + 1; i++)
        shown.push(unit[i % unit.length]);
      const answer = unit[shown.length % unit.length];
      const options = shuffle([answer].concat(shapes.filter(shape => shape !== answer).slice(0, 3)));
      return { prompt: "What comes next?", speak: "What comes next in the pattern?", visual: `${shown.join("")}❓`, options, answer };
    }
    const groups = shuffle(GROUPS);
    const odd = pick(groups[1].items);
    const options = shuffle(shuffle(groups[0].items).slice(0, 3).concat([odd]));
    return { prompt: "Which one does not belong?", speak: "Which one does not belong?", visual: "", options, answer: odd };
  }

  function speak(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance)
        return;
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    catch {
      /* Reading aloud is optional. */
    }
  }

  function openQuiz(person, item) {
    state.quiz = { personId: person.id, itemId: item.id, question: makeQuestion(person.name), phase: "ask", picked: null, pin: "", message: "", busy: false };
    renderQuiz();
    speak(state.quiz.question.speak);
  }

  function closeQuiz() {
    state.quiz = null;
    renderQuiz();
  }

  function renderQuiz() {
    const layer = document.getElementById("quiz");
    const quiz = state.quiz;
    if (!quiz) {
      layer.innerHTML = "";
      return;
    }
    const person = findPerson(quiz.personId);
    const item = findItem(person, quiz.itemId);
    if (!person || !item) {
      layer.innerHTML = "";
      state.quiz = null;
      return;
    }
    const question = quiz.question;
    const isNumberAnswer = /^\d+$/.test(question.answer);

    let html = `<div class="quiz-wrap"><div class="quiz-card${quiz.shake ? " shake" : ""}" style="border-top-color:${esc(person.color)}">`
      + `<div class="quiz-head"><span class="quiz-chore"><span class="ic">${icon(item.icon)}</span>${esc(item.title)}</span>`
      + `<button type="button" class="quiz-icon-btn" data-quiz="speak" aria-label="Read aloud">🔊</button>`
      + `<button type="button" class="quiz-icon-btn" data-quiz="close" aria-label="Close">✕</button></div>`
      + `<div class="quiz-title">${quiz.phase === "ask" ? `Quick question, ${esc(person.name)}! 🧠` : "Not quite! 🤔"}</div>`;

    if (question.visual)
      html += `<div class="quiz-visual">${esc(question.visual)}</div>`;
    html += `<div class="quiz-prompt">${esc(question.prompt)}</div>`;

    html += `<div class="quiz-options${isNumberAnswer ? "" : " emoji"}">${question.options.map((option) => {
      let classes = "quiz-option";
      if (quiz.picked !== null) {
        if (option === question.answer)
          classes += " right";
        else if (option === quiz.picked)
          classes += " wrong";
      }
      return `<button type="button" class="${classes}" data-quiz="answer" data-value="${esc(option)}"${quiz.picked !== null ? " disabled" : ""}>${esc(option)}</button>`;
    }).join("")}</div>`;

    if (quiz.phase === "pin") {
      let dots = "";
      for (let i = 0; i < 4; i++)
        dots += `<span class="pin-dot${i < quiz.pin.length ? " filled" : ""}"></span>`;
      html += `<div class="pin-box"><div class="pin-title">Ask a grown-up to enter the PIN</div>`
        + `<div class="pin-dots">${dots}</div>`
        + `<div class="pin-message">${esc(quiz.message)}</div>`
        + `<div class="pin-pad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "cancel", "0", "back"].map((key) => {
          const label = key === "cancel" ? "Cancel" : key === "back" ? "⌫" : key;
          return `<button type="button" class="pin-key${key.length > 1 ? " small" : ""}" data-quiz="pin" data-value="${key}"${quiz.busy ? " disabled" : ""}>${label}</button>`;
        }).join("")}</div></div>`;
    }

    layer.innerHTML = `${html}</div></div>`;
    quiz.shake = false;
  }

  function answerQuiz(value) {
    const quiz = state.quiz;
    if (!quiz || quiz.picked !== null)
      return;
    quiz.picked = value;
    if (value === quiz.question.answer) {
      renderQuiz();
      speak("Yes! Great job!");
      setTimeout(() => {
        const done = state.quiz;
        closeQuiz();
        if (done) {
          submitCompletion(done.personId, done.itemId, { verifiedBy: "quiz" }).catch((error) => {
            showError(`Couldn't save that. Try again. ${error.message}`);
          });
        }
      }, 900);
      return;
    }
    quiz.phase = "pin";
    quiz.shake = true;
    renderQuiz();
    speak("Not quite. The right answer is in green. Ask a grown-up to check.");
  }

  function pressPinKey(key) {
    const quiz = state.quiz;
    if (!quiz || quiz.phase !== "pin" || quiz.busy)
      return;
    if (key === "cancel") {
      closeQuiz();
      return;
    }
    if (key === "back") {
      quiz.pin = quiz.pin.slice(0, -1);
      renderQuiz();
      return;
    }
    if (quiz.pin.length >= 4)
      return;
    quiz.pin += key;
    quiz.message = "";
    renderQuiz();
    if (quiz.pin.length < 4)
      return;

    quiz.busy = true;
    renderQuiz();
    submitCompletion(quiz.personId, quiz.itemId, { pin: quiz.pin })
      .then(() => {
        closeQuiz();
      })
      .catch((error) => {
        if (state.quiz !== quiz)
          return;
        quiz.busy = false;
        quiz.pin = "";
        quiz.shake = true;
        quiz.message = error.status === 403 ? "Wrong PIN, try again" : error.status === 429 ? "Too many tries. Wait a minute." : "Couldn't save. Try again.";
        renderQuiz();
      });
  }

  function handleQuizClick(target) {
    const action = target.getAttribute("data-quiz");
    if (action === "close")
      closeQuiz();
    else if (action === "speak" && state.quiz)
      speak(state.quiz.question.speak);
    else if (action === "answer")
      answerQuiz(target.getAttribute("data-value"));
    else if (action === "pin")
      pressPinKey(target.getAttribute("data-value"));
  }

  function toggleStep(personId, routineId, stepId) {
    const person = findPerson(personId);
    if (!person || state.working[stepId])
      return;
    const routine = person.routines.filter(candidate => candidate.id === routineId)[0];
    if (!routine)
      return;
    const step = routine.steps.filter(candidate => candidate.id === stepId)[0];
    if (!step)
      return;

    const wasCompleted = routine.completed;
    step.done = !step.done;
    state.working[stepId] = true;
    render();
    api("POST", `/api/routines/${encodeURIComponent(routineId)}/progress`, { stepId, done: step.done })
      .then((result) => {
        delete state.working[stepId];
        const doneIds = result.completedStepIds || [];
        routine.steps.forEach((candidate) => {
          candidate.done = doneIds.includes(candidate.id);
        });
        routine.completed = !!result.completedAt;
        if (result.pointsAwarded > 0) {
          person.points += result.pointsAwarded;
          person.pointsToday += result.pointsAwarded;
        }
        render();
        if (routine.completed && !wasCompleted) {
          bumpPoints(personId);
          celebrate(routine.name, result.pointsAwarded);
        }
      })
      .catch((error) => {
        delete state.working[stepId];
        step.done = !step.done;
        render();
        showError(`Couldn't save that. Try again. ${error.message}`);
      });
  }

  document.addEventListener("click", (event) => {
    let target = event.target;
    while (target && target !== document.body && !(target.getAttribute && (target.getAttribute("data-action") || target.getAttribute("data-quiz"))))
      target = target.parentNode;
    if (!target || target === document.body || !target.getAttribute)
      return;
    if (target.getAttribute("data-quiz")) {
      handleQuizClick(target);
      return;
    }
    const action = target.getAttribute("data-action");
    if (action === "complete")
      completeItem(target.getAttribute("data-person"), target.getAttribute("data-id"));
    else if (action === "step")
      toggleStep(target.getAttribute("data-person"), target.getAttribute("data-routine"), target.getAttribute("data-id"));
  });

  /* ---------- Refresh ---------- */

  let errorTimer = null;
  function showError(message) {
    let bar = document.getElementById("error-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "error-bar";
      bar.className = "error-bar";
      document.body.appendChild(bar);
    }
    bar.textContent = message;
    bar.style.display = "block";
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => {
      bar.style.display = "none";
    }, 8000);
  }

  function hasWork() {
    for (const key in state.working) {
      if (Object.prototype.hasOwnProperty.call(state.working, key))
        return true;
    }
    return false;
  }

  function refresh() {
    if (state.celebrating || state.quiz || hasWork())
      return;
    api("GET", `/api/kiosk${state.who ? `?who=${encodeURIComponent(state.who)}` : ""}`)
      .then((data) => {
        state.data = data;
        state.failures = 0;
        state.lastLoaded = Date.now();
        if (!state.celebrating && !hasWork())
          render();
      })
      .catch(() => {
        state.failures++;
        renderStatus();
        // Usually an expired Cloudflare login; a full reload goes through the sign-in again.
        if (state.failures >= RELOAD_AFTER_FAILURES)
          window.location.reload();
      });
  }

  window.onerror = function (message) {
    showError(`Kiosk error: ${message}`);
  };

  render();
  if (!state.data)
    refresh();
  setInterval(renderClock, 10 * 1000);
  setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden)
      refresh();
  });
  // Pick up new versions of this page now and then.
  setTimeout(() => {
    window.location.reload();
  }, 6 * 60 * 60 * 1000);
})();
