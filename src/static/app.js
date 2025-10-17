document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid injecting raw HTML
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Avoid cached responses so UI always reflects the latest server state
      const response = await fetch("/activities", { cache: 'no-cache' });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicated options on re-render
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants && details.participants.length
          ? '<ul class="participants-list">' + details.participants.map(p => `<li><span class="participant-email">${escapeHTML(p)}</span> <button class="participant-remove" data-activity="${escapeHTML(name)}" data-email="${escapeHTML(p)}" title="Remove participant">&times;</button></li>`).join('') + '</ul>'
          : '<ul class="none"><li>No participants yet</li></ul>';

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // NOTE: remove-button handlers are registered once below (outside fetch) to avoid duplicates
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Refresh activities so participants and availability update immediately
        // await to ensure the list is updated before showing the success message
        await fetchActivities();

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      // Show feedback message
      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegated click handler for remove buttons (attach once)
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest && e.target.closest('.participant-remove');
    if (!btn) return;

    const activityName = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');

    if (!activityName || !email) return;

    // Confirm removal
    if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        messageDiv.textContent = data.message;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');

        // Refresh activities list to reflect removal
        await fetchActivities();
      } else {
        messageDiv.textContent = data.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }

      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    } catch (err) {
      console.error('Error unregistering participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });
});
