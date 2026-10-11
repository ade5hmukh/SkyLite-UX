/* Runs on Safari 12 (iOS 12): no optional chaining, nullish coalescing, Object.fromEntries, or Array.prototype.at. */
(function () {
  "use strict";

  const REFRESH_MS = 60 * 1000;
  const RELOAD_AFTER_FAILURES = 5;
  const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"];

  const state = {
    data: window.KIOSK_DATA || null,
    who: window.KIOSK_WHO || "",
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
      if (!response.ok)
        throw new Error(`Request failed (${response.status})`);
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

  function completeItem(personId, itemId) {
    const person = findPerson(personId);
    if (!person || state.working[itemId])
      return;
    const item = person.items.filter(candidate => candidate.id === itemId)[0];
    if (!item || item.completed)
      return;

    state.working[itemId] = true;
    render();
    api("POST", "/api/kiosk/complete", { todoId: itemId })
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
      })
      .catch((error) => {
        delete state.working[itemId];
        render();
        showError(`Couldn't save that. Try again. ${error.message}`);
      });
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
    while (target && target !== document.body && !(target.getAttribute && target.getAttribute("data-action")))
      target = target.parentNode;
    if (!target || target === document.body || !target.getAttribute)
      return;
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
    if (state.celebrating || hasWork())
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
