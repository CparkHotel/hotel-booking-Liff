let profile = null;
let selectedRoom = null;
let rooms = [];
let selectedBedType = '';

function $(id) {
  return document.getElementById(id);
}

// 1. LIFF Init & Auto Load Bookings
async function init() {
  try {
    const liffId = (typeof CONFIG !== 'undefined' && CONFIG.LIFF_ID) ? CONFIG.LIFF_ID : "";

    if (liffId && typeof liff !== 'undefined') {
      await liff.init({ liffId: liffId });
      if (liff.isLoggedIn()) {
        profile = await liff.getProfile();
        if (profile && profile.userId) {
          localStorage.setItem("line_user_id", profile.userId);
        }
      } else {
        liff.login();
        return;
      }
    }
  } catch (e) {
    console.error("LIFF Init Error:", e);
  }
  setDateLimits();
  
  // 🟢 App စဖွင့်တာနဲ့ Home Page ပေါ်မှာ Booking စာရင်း တန်းဖတ်ပေးမည်
  loadBookings();
}

window.addEventListener("DOMContentLoaded", () => {
  init();
});

function setDateLimits() {
  const today = new Date();
  const iso = today.toISOString().split("T")[0];
  if ($("checkin")) $("checkin").min = iso;
  if ($("checkout")) $("checkout").min = iso;

  if ($("checkin") && $("checkout")) {
    $("checkin").addEventListener("change", () => {
      $("checkout").min = $("checkin").value;
      if ($("checkout").value && $("checkout").value <= $("checkin").value) {
        $("checkout").value = "";
      }
    });
  }
}

function showPage(id) {
  try {
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.remove("active");
    });
    const page = $(id);
    if (page) {
      page.classList.add("active");
      window.scrollTo(0, 0);
    }
  } catch (error) {
    console.error("SHOW PAGE ERROR:", error);
  }
}

function closeLiff() {
  if (window.liff && liff.isInClient()) liff.closeWindow();
}

function getUserId() {
  return profile?.userId || localStorage.getItem("line_user_id") || "WEB_TEST_USER";
}

function selectBedType(type) {
  selectedBedType = type;
  showPage('searchPage');
}

function toggleInvoiceForm() {
  const needInvoice = $("needInvoice") ? $("needInvoice").checked : false;
  if ($("invoiceFields")) {
    $("invoiceFields").style.display = needInvoice ? "block" : "none";
  }
}

async function searchRooms() {
  const checkin = $("checkin").value;
  const checkout = $("checkout").value;
  const guests = Number($("guests").value);

  if (!checkin || !checkout || checkout <= checkin) {
    alert("Please select valid check-in and check-out dates.");
    return;
  }

  $("rooms").innerHTML = "<div class='card'>Searching available rooms...</div>";

  try {
    const searchUrl = CONFIG.SEARCH_WEBHOOK;
    const r = await fetch(searchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin, checkout, guests, bedType: selectedBedType }),
    });
    const data = await r.json();
    rooms = data.rooms || data || [];
    if (!Array.isArray(rooms)) rooms = [];
    renderRooms();
  } catch (e) {
    console.error("SEARCH ROOMS ERROR:", e);
    $("rooms").innerHTML = "<div class='error'>Failed to search rooms. Please try again.</div>";
  }
}

function renderRooms() {
  if (!rooms.length) {
    $("rooms").innerHTML = "<div class='card'>No available rooms for these dates.</div>";
    return;
  }
  $("rooms").innerHTML = rooms
    .map(
      (r, i) => `
    <div class="room-card">
      <img class="room-img" src="${escapeHtml(r.image_url || r.imageUrl || "https://via.placeholder.com/120x90?text=Room")}" onerror="this.src='https://via.placeholder.com/120x90?text=Room'">
      <div class="grow">
        <b>${escapeHtml(r.room_name || r.roomName || "Room")}</b>
        <div class="muted">${escapeHtml(r.room_type || r.roomType || "")}</div>
        <div class="price">${Number(r.price_per_night || r.price || 0).toLocaleString()} THB / night</div>
      </div>
      <button class="select-btn" onclick="selectRoom(${i})">Select</button>
    </div>`
    )
    .join("");
}

function selectRoom(i) {
  try {
    selectedRoom = rooms[i];
    if (!selectedRoom) {
      alert("Room information not found.");
      return;
    }
    const roomName = selectedRoom.room_name || selectedRoom.roomName || "Room";
    const roomType = selectedRoom.room_type || selectedRoom.roomType || "";
    const price = Number(selectedRoom.price_per_night || selectedRoom.price || 0).toLocaleString();
    const checkin = $("checkin").value;
    const checkout = $("checkout").value;

    $("selectedRoomBox").innerHTML = `
      <div class="booking-item">
        <b>${escapeHtml(roomName)}</b>
        ${roomType ? `<div class="muted">Room Type: ${escapeHtml(roomType)}</div>` : ""}
        <div class="price">${price} THB / night</div>
        <div class="muted">${escapeHtml(checkin)} → ${escapeHtml(checkout)}</div>
      </div>`;
    showPage("infoPage");
  } catch (error) {
    console.error("SELECT ROOM ERROR:", error);
    alert("Unable to select this room. Please try again.");
  }
}

function showConfirm() {
  const nameEl = document.getElementById("customerName");
  const phoneEl = document.getElementById("phone");

  const nameVal = nameEl ? nameEl.value.trim() : "";
  const phoneVal = phoneEl ? phoneEl.value.trim() : "";

  if (!nameVal || !phoneVal) {
    alert("Please enter your name and phone number.");
    return;
  }

  const needInvoiceEl = document.getElementById("needInvoice");
  const needInvoice = needInvoiceEl ? needInvoiceEl.checked : false;
  let invoiceHtml = "";

  if (needInvoice) {
    const compEl = document.getElementById("companyName");
    const taxEl = document.getElementById("taxId");
    const addrEl = document.getElementById("billingAddress");

    const compVal = compEl ? compEl.value.trim() : "-";
    const taxVal = taxEl ? taxEl.value.trim() : "-";
    const addrVal = addrEl ? addrEl.value.trim() : "-";

    invoiceHtml = `
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ccc;">
      <p><b>Tax Invoice / Receipt Required</b></p>
      <p><b>Company/Tax Name:</b> ${escapeHtml(compVal || "-")}</p>
      <p><b>Tax ID:</b> ${escapeHtml(taxVal || "-")}</p>
      <p><b>Address:</b> ${escapeHtml(addrVal || "-")}</p>
    `;
  }

  const roomName = selectedRoom ? (selectedRoom.room_name || selectedRoom.roomName || "Room") : "Room";
  const roomType = selectedRoom ? (selectedRoom.room_type || selectedRoom.roomType || "-") : "-";

  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const guestsEl = document.getElementById("guests");
  const noteEl = document.getElementById("note");

  const confirmBox = document.getElementById("confirmBox");
  if (confirmBox) {
    confirmBox.innerHTML = `
      <b>${escapeHtml(roomName)}</b>
      <p><b>Room Type:</b> ${escapeHtml(roomType)}</p>
      <p><b>Date:</b> ${checkinEl ? checkinEl.value : ""} → ${checkoutEl ? checkoutEl.value : ""}</p>
      <p><b>Guests:</b> ${guestsEl ? guestsEl.value : ""}</p>
      <p><b>Name:</b> ${escapeHtml(nameVal)}</p>
      <p><b>Phone:</b> ${escapeHtml(phoneVal)}</p>
      <p><b>Note:</b> ${escapeHtml(noteEl ? noteEl.value : "-")}</p>
      ${invoiceHtml}`;
  }

  showPage("confirmPage");
}

async function createBooking() {
  if (!selectedRoom) {
    alert("No room selected!");
    return;
  }

  const nameEl = document.getElementById("customerName");
  const phoneEl = document.getElementById("phone");
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const guestsEl = document.getElementById("guests");
  const noteEl = document.getElementById("note");

  const validRoomId = selectedRoom.room_id || selectedRoom.roomId || selectedRoom.id || selectedRoom.room_name || "ROOM-01";
  const needInvoiceEl = document.getElementById("needInvoice");
  const needInvoice = needInvoiceEl ? needInvoiceEl.checked : false;

  const compEl = document.getElementById("companyName");
  const taxEl = document.getElementById("taxId");
  const addrEl = document.getElementById("billingAddress");

  const compName = compEl ? compEl.value.trim() : "";
  const taxIdVal = taxEl ? taxEl.value.trim() : "";
  const addressVal = addrEl ? addrEl.value.trim() : "";

  const payload = {
    user_id: getUserId(),
    customer_name: nameEl ? nameEl.value.trim() : "",
    phone: phoneEl ? phoneEl.value.trim() : "",
    room_id: String(validRoomId),
    room_name: selectedRoom.room_name || selectedRoom.roomName || "",
    room_type: selectedRoom.room_type || selectedRoom.roomType || "",
    check_in: checkinEl ? checkinEl.value : "",
    check_out: checkoutEl ? checkoutEl.value : "",
    guests: guestsEl ? Number(guestsEl.value) : 1,
    note: noteEl ? noteEl.value.trim() : "",
    price: selectedRoom.price_per_night || selectedRoom.price || "-",
    
    need_invoice: needInvoice,
    company_name: needInvoice ? compName : "",
    tax_id: needInvoice ? taxIdVal : "",
    billing_address: needInvoice ? addressVal : "",
    
    invoice_info: needInvoice ? {
      company_name: compName,
      tax_id: taxIdVal,
      billing_address: addressVal
    } : null
  };

  try {
    const bookingUrl = CONFIG.BOOKING_WEBHOOK;
    const r = await fetch(bookingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.success) {
      alert(data.message || "Booking failed.");
      return;
    }
    const resultBox = document.getElementById("bookingIdResult");
    if (resultBox) {
      resultBox.innerHTML = `<p><b>Booking ID: ${escapeHtml(data.booking_id || "")}</b></p><p class="muted">Please wait for confirmation.</p>`;
    }
    
    // Booking တင်ပြီးပါက My Bookings စာရင်းကို အလိုအလျောက် Update ပြန်လုပ်ပေးမည်
    loadBookings();
    showPage("successPage");
  } catch (e) {
    console.error("BOOKING ERROR:", e);
    alert("Booking failed. Please check connection.");
  }
}

async function loadBookings() {
  const container = $("myBookings");
  if (!container) return;

  container.innerHTML = "<div class='card'>Loading your bookings...</div>";
  try {
    const r = await fetch(CONFIG.MY_BOOKINGS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: getUserId() }),
    });
    const data = await r.json();
    const list = data.bookings || [];
    container.innerHTML = list.length
      ? list
          .map(
            (b) => `
        <div class="booking-item" style="background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #e0e0e0; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
          <b>${escapeHtml(b.room_name || "Room")}</b>
          <div class="muted">Room Type: ${escapeHtml(b.room_type || "-")}</div>
          <div><b>Date:</b> ${escapeHtml(b.check_in)} → ${escapeHtml(b.check_out)}</div>
          <div><b>Guests:</b> ${escapeHtml(String(b.guests || ""))}</div>
          <p><span class="status" style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${escapeHtml(b.status || "Pending")}</span></p>
          <div class="muted" style="font-size: 11px;">Booking ID: ${escapeHtml(b.booking_id || "")}</div>
        </div>`
          )
          .join("")
      : "<div class='card'>No bookings found.</div>";
  } catch (e) {
    console.error("LOAD BOOKINGS ERROR:", e);
    container.innerHTML = "<div class='error'>Could not load bookings.</div>";
  }
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
