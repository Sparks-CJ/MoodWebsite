document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("journal-form");
  const entryInput = document.getElementById("entry");
  const entriesContainer = document.getElementById("entries");

  const lineCtx = document.getElementById("lineChart").getContext("2d");
  const pieCtx = document.getElementById("pieChart").getContext("2d");

  let lineChart, pieChart;

  // Submit entry
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = entryInput.value.trim();
    if (!text) return;

    const res = await fetch("/add_entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      entryInput.value = "";
      loadEntries();
    }
  });

  // Load entries
  async function loadEntries() {
    const res = await fetch("/get_entries");
    const data = await res.json();
    entriesContainer.innerHTML = "";

    let labels = [];
    let scores = [];
    let emotionsCount = {};

    data.forEach(entry => {
      // Display entry card
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <p class="text-gray-700">${entry.text}</p>
        <p class="mt-2 text-sm text-indigo-600 font-medium">Mood: ${entry.label} (${Math.round(entry.score * 100)}%)</p>
        <p class="text-xs text-gray-400">${new Date(entry.created_at).toLocaleString()}</p>
      `;
      entriesContainer.appendChild(card);

      // Data for charts
      labels.push(new Date(entry.created_at).toLocaleDateString());
      scores.push(Math.round(entry.score * 100));
      emotionsCount[entry.label] = (emotionsCount[entry.label] || 0) + 1;
    });

    // Update line chart
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Mood Confidence (%)",
          data: scores,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          fill: true,
          tension: 0.3
        }]
      }
    });

    // Update pie chart
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: "pie",
      data: {
        labels: Object.keys(emotionsCount),
        datasets: [{
          data: Object.values(emotionsCount),
          backgroundColor: ["#34d399", "#f87171", "#60a5fa", "#fbbf24", "#a78bfa"]
        }]
      }
    });
  }

  loadEntries();
});

