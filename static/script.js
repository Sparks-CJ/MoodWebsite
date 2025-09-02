const form = document.getElementById("entry-form");
const moodEl = document.getElementById("mood");
const noteEl = document.getElementById("note");
const msgEl = document.getElementById("form-msg");
const entriesEl = document.getElementById("entries");

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function loadEntries() {
  entriesEl.innerHTML = "Loading…";
  try {
    const items = await fetchJSON("/api/entries");
    if (!items.length) {
      entriesEl.innerHTML = "<p class='muted'>No entries yet.</p>";
      return;
    }
    entriesEl.innerHTML = items
      .map(
        (e) => `
      <article class="entry">
        <header>
          <strong>${e.mood}</strong>
          <span class="time">${new Date(e.created_at).toLocaleString()}</span>
        </header>
        <p>${(e.note || "").replace(/</g, "&lt;")}</p>
        <footer class="muted">
          Sentiment: ${e.sentiment_label || "—"} (${e.sentiment_score ?? 0}%)
        </footer>
      </article>
    `
      )
      .join("");
  } catch (err) {
    entriesEl.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.textContent = "Saving…";
  try {
    await fetchJSON("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: moodEl.value,
        note: noteEl.value,
      }),
    });
    noteEl.value = "";
    msgEl.textContent = "Saved!";
    loadEntries();
  } catch (err) {
    msgEl.textContent = `Error: ${err.message}`;
  }
});

loadEntries();
