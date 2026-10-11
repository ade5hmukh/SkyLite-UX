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

  // Three choices: easy to scan at 5-6, while a random tap only passes one time in three.
  const CHOICES = 3;

  /** The answer plus believable wrong ones: tried first are `likely` mistakes (e.g. off by ten, swapped digits). */
  function numberOptions(answer, max, likely) {
    const options = [answer];
    const candidates = shuffle(likely || []).concat(shuffle([answer - 1, answer + 1, answer - 2, answer + 2, answer + 3, answer - 3]));
    for (let i = 0; i < candidates.length && options.length < CHOICES; i++) {
      const candidate = candidates[i];
      if (candidate >= 0 && candidate <= max && !options.includes(candidate))
        options.push(candidate);
    }
    while (options.length < CHOICES) {
      const extra = randomInt(0, max);
      if (!options.includes(extra))
        options.push(extra);
    }
    return shuffle(options).map(String);
  }

  function swapDigits(value) {
    return value >= 10 && value < 100 ? Number(String(value).split("").reverse().join("")) : -1;
  }

  function numberQuestion(kind, prompt, speakText, answer, max, likely, visual) {
    return { kind, prompt, speak: speakText, visual: visual || "", options: numberOptions(answer, max, likely), answer: String(answer) };
  }

  function clockFace(hour, half) {
    return String.fromCodePoint((half ? 0x1F55C : 0x1F550) + hour - 1);
  }

  function wrapHour(hour) {
    return ((hour + 11) % 12) + 1;
  }

  const THINGS = [["🍎", "apples"], ["⭐", "stars"], ["🎈", "balloons"], ["🐟", "fish"], ["🌸", "flowers"], ["🍓", "strawberries"], ["🚗", "cars"], ["🐞", "ladybugs"], ["⚽", "balls"], ["🧁", "cupcakes"], ["🍪", "cookies"], ["🖍️", "crayons"]];
  const LEAVING = [["🎈", "balloons", "pop"], ["🐦", "birds", "fly away"], ["🐟", "fish", "swim away"], ["🍪", "cookies", "get eaten"], ["🦋", "butterflies", "fly away"]];
  const HELPERS = ["Mom", "Dad", "Grandma", "Grandpa", "A friend"];
  const GROUPS = [
    { name: "fruit", items: ["🍎", "🍌", "🍇", "🍓", "🍊", "🍉"] },
    { name: "animal", items: ["🐶", "🐱", "🐰", "🐮", "🐷", "🦁"] },
    { name: "vehicle", items: ["🚗", "🚌", "🚲", "✈️", "🚂", "🚀"] },
    { name: "clothes", items: ["👕", "👖", "🧦", "👗", "🧢", "👟"] },
  ];

  function compareQuestion(kind, numbers) {
    const smaller = Math.random() < 0.4;
    const answer = smaller ? Math.min.apply(null, numbers) : Math.max.apply(null, numbers);
    const text = `Which number is the ${smaller ? "smallest" : "biggest"}?`;
    return { kind, prompt: text, speak: text, visual: "", options: shuffle(numbers).map(String), answer: String(answer) };
  }

  function sequenceQuestion(kind, start, step, max) {
    const shown = [start, start + step, start + step * 2];
    const answer = start + step * 3;
    return numberQuestion(kind, `${shown.join(", ")}, ?`, `What number comes next? ${shown.join(", ")}`, answer, max, [answer + 1, answer - step + 1, start + step * 4]);
  }

  // Common Core: level 1 reviews kindergarten, levels 2-3 cover first grade (1.OA, 1.NBT, 1.MD.3).
  const BUILDERS = {
    // Level 1: kindergarten review, within 10
    add10() {
      const a = randomInt(1, 6);
      const b = randomInt(1, 10 - a);
      const thing = pick(THINGS);
      return numberQuestion("add10", `${a} + ${b} = ?`, `What is ${a} plus ${b}?`, a + b, 12, [], `${repeat(thing[0], a)} ➕ ${repeat(thing[0], b)}`);
    },
    sub10() {
      const a = randomInt(3, 10);
      const b = randomInt(1, a - 1);
      return numberQuestion("sub10", `${a} − ${b} = ?`, `What is ${a} minus ${b}?`, a - b, 10, [a + b]);
    },
    count10() {
      const a = randomInt(4, 12);
      const thing = pick(THINGS);
      return numberQuestion("count10", `How many ${thing[0]}?`, `How many ${thing[1]} do you see?`, a, 14, [], repeat(thing[0], a));
    },
    compare10() {
      return compareQuestion("compare10", shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, CHOICES));
    },
    next10() {
      return sequenceQuestion("next10", randomInt(1, 15), 1, 20);
    },
    storyAdd10(name) {
      const a = randomInt(1, 5);
      const b = randomInt(1, 5);
      const thing = pick(THINGS);
      const helper = pick(HELPERS);
      return numberQuestion("storyAdd10", `${name} has ${a} ${thing[0]}. ${helper} gives ${b} more. How many now?`, `${name} has ${a} ${thing[1]}. ${helper} gives ${b} more. How many now?`, a + b, 12);
    },
    pattern() {
      const shapes = shuffle(["🔴", "🔵", "🟡", "🟢", "🟣", "⭐", "❤️"]);
      const unit = Math.random() < 0.5 ? [shapes[0], shapes[1]] : [shapes[0], shapes[1], shapes[2]];
      const shown = [];
      for (let i = 0; i < unit.length * 2 + 1; i++)
        shown.push(unit[i % unit.length]);
      const answer = unit[shown.length % unit.length];
      const options = shuffle([answer].concat(shapes.filter(shape => shape !== answer).slice(0, CHOICES - 1)));
      return { kind: "pattern", prompt: "What comes next?", speak: "What comes next in the pattern?", visual: `${shown.join("")}❓`, options, answer };
    },
    oddOne() {
      const groups = shuffle(GROUPS);
      const odd = pick(groups[1].items);
      const options = shuffle(shuffle(groups[0].items).slice(0, CHOICES - 1).concat([odd]));
      return { kind: "oddOne", prompt: "Which one does not belong?", speak: "Which one does not belong?", visual: "", options, answer: odd };
    },

    // Level 2: early first grade, within 20
    add20() {
      const a = randomInt(4, 12);
      const b = randomInt(2, 20 - a);
      return numberQuestion("add20", `${a} + ${b} = ?`, `What is ${a} plus ${b}?`, a + b, 20, [a + b + 10, a + b - 10]);
    },
    sub20() {
      const a = randomInt(11, 20);
      const b = randomInt(2, 9);
      return numberQuestion("sub20", `${a} − ${b} = ?`, `What is ${a} minus ${b}?`, a - b, 20, [a - b + 10]);
    },
    makeTen() {
      const a = randomInt(1, 9);
      return numberQuestion("makeTen", `${a} + ? = 10`, `${a} plus what makes 10?`, 10 - a, 10, [a, 10 - a + 1], repeat("🟢", a) + repeat("⚪", 10 - a));
    },
    missingAddend() {
      const total = randomInt(9, 20);
      const a = randomInt(2, total - 2);
      return numberQuestion("missingAddend", `${a} + ? = ${total}`, `${a} plus what equals ${total}?`, total - a, 20, [total, total + a]);
    },
    threeAddends() {
      const a = randomInt(1, 6);
      const b = randomInt(1, 6);
      const c = randomInt(1, 6);
      return numberQuestion("threeAddends", `${a} + ${b} + ${c} = ?`, `What is ${a} plus ${b} plus ${c}?`, a + b + c, 20, [a + b, b + c]);
    },
    storyAdd20(name) {
      const a = randomInt(5, 12);
      const b = randomInt(3, 20 - a);
      const thing = pick(THINGS);
      const helper = pick(HELPERS);
      return numberQuestion("storyAdd20", `${name} has ${a} ${thing[0]}. ${helper} gives ${b} more. How many now?`, `${name} has ${a} ${thing[1]}. ${helper} gives ${b} more. How many now?`, a + b, 20);
    },
    storySub20() {
      const a = randomInt(11, 20);
      const b = randomInt(3, 9);
      const thing = pick(LEAVING);
      return numberQuestion("storySub20", `There are ${a} ${thing[0]}. ${b} ${thing[2]}. How many are left?`, `There are ${a} ${thing[1]}. ${b} ${thing[2]}. How many are left?`, a - b, 20, [a + b]);
    },
    storyCompare(name) {
      const a = randomInt(7, 18);
      const b = randomInt(2, a - 2);
      const thing = pick(THINGS);
      const other = pick(["Mom", "Dad", "Grandma", "Grandpa"]);
      return numberQuestion("storyCompare", `${name} has ${a} ${thing[0]}. ${other} has ${b} ${thing[0]}. How many more does ${name} have?`, `${name} has ${a} ${thing[1]}. ${other} has ${b}. How many more does ${name} have?`, a - b, 20, [a + b, a]);
    },
    skipCount() {
      const step = pick([2, 5, 10]);
      return sequenceQuestion("skipCount", step * randomInt(0, step === 2 ? 8 : 6), step, 100);
    },
    timeHour() {
      const hour = randomInt(1, 12);
      const others = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(other => other !== hour)).slice(0, CHOICES - 1);
      return { kind: "timeHour", prompt: "What time is it?", speak: "What time does the clock show?", visual: clockFace(hour, false), big: true, options: shuffle([hour].concat(others)).map(h => `${h}:00`), answer: `${hour}:00` };
    },

    // Level 3: end of first grade, place value and two-digit numbers
    tensOnes() {
      const tens = randomInt(1, 9);
      const ones = randomInt(0, 9);
      const answer = tens * 10 + ones;
      return numberQuestion("tensOnes", `${tens} tens and ${ones} ones = ?`, `What number is ${tens} tens and ${ones} ones?`, answer, 99, [swapDigits(answer), tens + ones, answer + 10], `${repeat("🔟", tens)} ${repeat("🔹", ones)}`);
    },
    tensIn() {
      const answer = randomInt(2, 9);
      const ones = randomInt(1, 9);
      const value = answer * 10 + ones;
      return numberQuestion("tensIn", `How many tens are in ${value}?`, `How many tens are in ${value}?`, answer, 99, [ones, value]);
    },
    tenMoreLess() {
      const more = Math.random() < 0.5;
      const value = randomInt(more ? 11 : 20, more ? 89 : 99);
      const answer = more ? value + 10 : value - 10;
      return numberQuestion("tenMoreLess", `What is 10 ${more ? "more" : "less"} than ${value}?`, `What is 10 ${more ? "more" : "less"} than ${value}?`, answer, 120, [more ? value + 1 : value - 1, more ? value - 10 : value + 10]);
    },
    addTens() {
      const a = randomInt(1, 7);
      const b = randomInt(1, 9 - a);
      return numberQuestion("addTens", `${a * 10} + ${b * 10} = ?`, `What is ${a * 10} plus ${b * 10}?`, (a + b) * 10, 100, [a + b, (a + b + 1) * 10, (a + b - 1) * 10]);
    },
    twoDigitPlusOne() {
      const a = randomInt(12, 88);
      const b = randomInt(2, 9);
      const answer = a + b;
      return numberQuestion("twoDigitPlusOne", `${a} + ${b} = ?`, `What is ${a} plus ${b}?`, answer, 99, [answer + 10, answer - 10, a + b * 10]);
    },
    subTens() {
      const a = randomInt(3, 9);
      const b = randomInt(1, a - 1);
      return numberQuestion("subTens", `${a * 10} − ${b * 10} = ?`, `What is ${a * 10} minus ${b * 10}?`, (a - b) * 10, 90, [a - b, (a - b + 1) * 10]);
    },
    compare100() {
      const tens = randomInt(2, 9);
      const ones = randomInt(1, 9);
      const base = tens * 10 + ones;
      const numbers = [base];
      [swapDigits(base), base + 10, base - 10, base + 1, base - 1, base - 20].forEach((candidate) => {
        if (numbers.length < CHOICES && candidate > 9 && candidate < 100 && !numbers.includes(candidate))
          numbers.push(candidate);
      });
      return compareQuestion("compare100", numbers);
    },
    countTo120() {
      return sequenceQuestion("countTo120", randomInt(96, 116), 1, 120);
    },
    tensFromAny() {
      const start = randomInt(1, 6) * 10 + randomInt(1, 9);
      return sequenceQuestion("tensFromAny", start, 10, 120);
    },
    missingSub() {
      const a = randomInt(11, 20);
      const b = randomInt(2, 9);
      return numberQuestion("missingSub", `${a} − ? = ${a - b}`, `${a} minus what equals ${a - b}?`, b, 20, [a - b, a + b - 10]);
    },
    storyMissing(name) {
      const start = randomInt(4, 11);
      const added = randomInt(2, 9);
      const thing = pick(THINGS);
      const total = start + added;
      return numberQuestion("storyMissing", `${name} has ${start} ${thing[0]} and gets some more. Now ${name} has ${total}. How many more did ${name} get?`, `${name} has ${start} ${thing[1]} and gets some more. Now ${name} has ${total}. How many more did ${name} get?`, added, 20, [total, total + start]);
    },
    timeHalf() {
      const hour = randomInt(1, 12);
      const options = [`${hour}:30`, `${hour}:00`, `${wrapHour(hour + 1)}:30`];
      return { kind: "timeHalf", prompt: "What time is it?", speak: "What time does the clock show?", visual: clockFace(hour, true), big: true, options: shuffle(options), answer: `${hour}:30` };
    },
  };

  const LEVELS = [
    null,
    { label: "Warm-up", kinds: ["add10", "sub10", "count10", "compare10", "next10", "storyAdd10", "pattern", "oddOne"] },
    { label: "1st grade", kinds: ["add20", "sub20", "makeTen", "missingAddend", "threeAddends", "storyAdd20", "storySub20", "storyCompare", "skipCount", "timeHour"] },
    { label: "1st grade star", kinds: ["tensOnes", "tensIn", "tenMoreLess", "addTens", "twoDigitPlusOne", "subTens", "compare100", "countTo120", "tensFromAny", "missingSub", "storyMissing", "timeHalf"] },
  ];
  const MAX_LEVEL = LEVELS.length - 1;
  const LEVEL_UP_STREAK = 4;
  const LEVEL_DOWN_MISSES = 2;

  /** Mostly questions at the kid's level, with some review from easier levels. */
  function makeQuestion(name, level) {
    let from = level;
    if (level > 1 && Math.random() < 0.3)
      from = randomInt(1, level - 1);
    const question = BUILDERS[pick(LEVELS[from].kinds)](name);
    question.level = level;
    return question;
  }

  function progressKey(name) {
    return `skylite.kiosk.quiz.${name.toLowerCase()}`;
  }

  function loadProgress(name) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(progressKey(name)) || "null");
      if (saved && saved.level >= 1 && saved.level <= MAX_LEVEL)
        return saved;
    }
    catch {
      /* Private browsing or bad data: start fresh. */
    }
    return { level: 1, streak: 0, misses: 0 };
  }

  function saveProgress(name, progress) {
    try {
      window.localStorage.setItem(progressKey(name), JSON.stringify(progress));
    }
    catch {
      /* Progress just won't persist. */
    }
  }

  /** Returns true when the kid moved up a level. */
  function recordAnswer(name, correct) {
    const progress = loadProgress(name);
    let leveledUp = false;
    if (correct) {
      progress.streak++;
      progress.misses = 0;
      if (progress.streak >= LEVEL_UP_STREAK && progress.level < MAX_LEVEL) {
        progress.level++;
        progress.streak = 0;
        leveledUp = true;
      }
    }
    else {
      progress.misses++;
      progress.streak = 0;
      if (progress.misses >= LEVEL_DOWN_MISSES && progress.level > 1) {
        progress.level--;
        progress.misses = 0;
      }
    }
    saveProgress(name, progress);
    return leveledUp;
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
    const level = loadProgress(person.name).level;
    state.quiz = { personId: person.id, itemId: item.id, name: person.name, question: makeQuestion(person.name, level), phase: "ask", picked: null, pin: "", message: "", busy: false, leveledUp: false };
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
      + `<div class="quiz-level">Level ${question.level} · ${esc(LEVELS[question.level].label)}</div>`
      + `<div class="quiz-title">${quiz.phase === "ask" ? `Quick question, ${esc(person.name)}! 🧠` : "Not quite! 🤔"}</div>`;

    if (quiz.leveledUp)
      html += `<div class="quiz-levelup">⭐ Level up! Now level ${question.level + 1} ⭐</div>`;
    if (question.visual)
      html += `<div class="quiz-visual${question.big ? " big" : ""}">${esc(question.visual)}</div>`;
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
    const correct = value === quiz.question.answer;
    quiz.summary = { level: quiz.question.level, kind: quiz.question.kind, prompt: quiz.question.prompt, answer: quiz.question.answer, picked: value, correct };
    if (correct) {
      quiz.leveledUp = recordAnswer(quiz.name, true);
      renderQuiz();
      speak(quiz.leveledUp ? "Yes! Great job! Level up!" : "Yes! Great job!");
      setTimeout(() => {
        const done = state.quiz;
        closeQuiz();
        if (done) {
          submitCompletion(done.personId, done.itemId, { verifiedBy: "quiz", quiz: done.summary }).catch((error) => {
            showError(`Couldn't save that. Try again. ${error.message}`);
          });
        }
      }, quiz.leveledUp ? 1800 : 900);
      return;
    }
    recordAnswer(quiz.name, false);
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
    submitCompletion(quiz.personId, quiz.itemId, { pin: quiz.pin, quiz: quiz.summary })
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
