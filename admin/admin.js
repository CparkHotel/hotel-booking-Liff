let calendar = null;

document.addEventListener("DOMContentLoaded", function () {
    initCalendar();
    fetchBookings(true); // ပထမဆုံးအကြိမ် Load လုပ်ချိန်တွင် Loading ပြမည်

    // စက္ကန့် ၁၀ တိုင်း Background တွင် Auto Sync လုပ်မည်
    setInterval(() => {
        fetchBookings(false); // Page refresh မဖြစ်ဘဲ background ကနေ update လုပ်မည်
    }, 10000);
});

function initCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
        },
        events: [],
        eventClick: function (info) {
            alert(
                `Booking Details: \n Customer: ${info.event.title} \n Room: ${info.event.extendedProps.room} \n Phone: ${info.event.extendedProps.phone}`
            );
        },
    });

    calendar.render();
}

async function fetchBookings(isInitial = false) {
    const listEl = document.getElementById("bookingList");
    
    // Initial Load မှာပဲ Loading စာသားပြမည် (Auto-sync ချိန်တွင် မျက်နှာပြင်မလှုပ်အောင်)
    if (isInitial && listEl) {
        listEl.innerHTML = "Loading bookings...";
    }

    try {
        const response = await fetch(ADMIN_CONFIG.BOOKINGS_WEBHOOK, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        const bookings = Array.isArray(data) ? data : data.bookings || [];

        // Calendar အတွက် Event Format ပြောင်းလဲခြင်း
        const events = bookings
            .map((b) => {
                const startDate = parseToISODate(b.check_in || b.checkin);
                let endDate = parseToISODate(b.check_out || b.checkout);
                if (!startDate) return null;

                if (endDate) {
                    const d = new Date(endDate);
                    d.setDate(d.getDate() + 1);
                    endDate = d.toISOString().split("T")[0];
                }
                return {
                    id: b.booking_id || b.id,
                    title: `${b.customer_name || "Guest"} (${b.room_name || b.room_id || "Room"})`,
                    start: startDate,
                    end: endDate || startDate,
                    color: b.status === "Confirmed" ? "#28a745" : "#ffc107",
                    extendedProps: {
                        phone: b.phone || "-",
                        room: b.room_name || b.room_id || "-",
                    },
                };
            })
            .filter(Boolean);

        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(events);
        }

        renderBookingList(bookings);
    } catch (error) {
        console.error("Error fetching admin bookings:", error);
        if (isInitial && listEl) {
            listEl.innerHTML = "<div class='error'>Failed to load bookings from server.</div>";
        }
    }
}

// Date String များကို YYYY-MM-DD Format သို့ ပြောင်းပေးသော Helper Function
function parseToISODate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function renderBookingList(bookings) {
  const listEl = document.getElementById("bookingList");
  if (!listEl) return;

  if (!bookings.length) {
    listEl.innerHTML = "<p style='color: var(--text-muted);'>No bookings found.</p>";
    return;
  }

  listEl.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Booking ID</th>
          <th>Customer</th>
          <th>Phone</th>
          <th>Room</th>
          <th>Dates</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${bookings
          .map(
            (b) => `
          <tr>
            <td><b>${escapeHtml(b.booking_id || b.id || "-")}</b></td>
            <td>${escapeHtml(b.customer_name || "-")}</td>
            <td>${escapeHtml(b.phone || "-")}</td>
            <td>${escapeHtml(b.room_name || b.room_id || "-")}</td>
            <td>${escapeHtml(b.check_in || "")} → ${escapeHtml(b.check_out || "")}</td>
            <td>
              <span class="status-pill ${b.status === "Confirmed" ? "confirmed" : "pending"}">
                ${escapeHtml(b.status || "Pending")}
              </span>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}
