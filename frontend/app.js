let profile = null;
let selectedRoom = null;
let rooms = [];
let selectedBedType = '';

function $(id) {
  return document.getElementById(id);
}

// 1. LIFF Init & Safe Storage
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
}

// Global Event Listener မသုံးဘဲ Direct Init
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
    if (!page) {
      console.error("Page not found:", id);
      return;
    }
    page.classList.add("active");
    window.scrollTo(0, 0);
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
  // Input Element များမှ value ကို သေချာစွာ ယူခြင်း
  const nameInput = $("customerName");
  const phoneInput = $("phone");

  const nameVal = nameInput ? nameInput.value.trim() : "";
  const phoneVal = phoneInput ? phoneInput.value.trim() : "";

  // အမည် သို့မဟုတ် ဖုန်းနံပါတ် မရှိပါက အသိပေးရန်
  if (!nameVal || !phoneVal) {
    alert("Please enter your name and phone number.");
    return;
  }

  const needInvoice = $("needInvoice") ? $("needInvoice").checked : false;
  let invoiceHtml = "";

  if (needInvoice) {
    const compVal = $("companyName") ? $("companyName").value : "-";
    const taxVal = $("taxId") ? $("taxId").value : "-";
    const addrVal = $("billingAddress") ? $("billingAddress").value : "-";

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

  $("confirmBox").innerHTML = `
    <b>${escapeHtml(roomName)}</b>
    <p><b>Room Type:</b> ${escapeHtml(roomType)}</p>
    <p><b>Date:</b> ${$("checkin") ? $("checkin").value : ""} → ${$("checkout") ? $("checkout").value : ""}</p>
    <p><b>Guests:</b> ${$("guests") ? $("guests").value : ""}</p>
    <p><b>Name:</b> ${escapeHtml(nameVal)}</p>
    <p><b>Phone:</b> ${escapeHtml(phoneVal)}</p>
    <p><b>Note:</b> ${escapeHtml($("note") ? $("note").value : "-")}</p>
    ${invoiceHtml}`;

  showPage("confirmPage");
}

async function createBooking() {
  if (!selectedRoom) {
    alert("No room selected!");
    return;
  }
  
  const validRoomId = selectedRoom.room_id || selectedRoom.roomId || selectedRoom.id || selectedRoom.room_name || "ROOM-01";
  const needInvoice = $("needInvoice") ? $("needInvoice").checked : false;
  const compName = $("companyName") ? $("companyName").value.trim() : "";
  const taxIdVal = $("taxId") ? $("taxId").value.trim() : "";
  const addressVal = $("billingAddress") ? $("billingAddress").value.trim() : "";

  const payload = {
    user_id: getUserId(),
    customer_name: $("customerName").value.trim(),
    phone: $("phone").value.trim(),
    room_id: String(validRoomId),
    room_name: selectedRoom.room_name || selectedRoom.roomName || "",
    room_type: selectedRoom.room_type || selectedRoom.roomType || "",
    check_in: $("checkin").value,
    check_out: $("checkout").value,
    guests: Number($("guests").value),
    note: $("note").value.trim(),
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
    const r = await fetch(CONFIG.BOOKING_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.success) {
      alert(data.message || "Booking failed.");
      return;
    }
    $("bookingIdResult").innerHTML = `<p><b>Booking ID: ${escapeHtml(data.booking_id || "")}</b></p><p class="muted">Please wait for confirmation.</p>`;
    showPage("successPage");
  } catch (e) {
    console.error("BOOKING ERROR:", e);
    alert("Booking failed. Please check connection.");
  }
}

async function loadBookings() {
  $("myBookings").innerHTML = "<div class='card'>Loading...</div>";
  try {
    const r = await fetch(CONFIG.MY_BOOKINGS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: getUserId() }),
    });
    const data = await r.json();
    const list = data.bookings || [];
    $("myBookings").innerHTML = list.length
      ? list
          .map(
            (b) => `
        <div class="booking-item">
          <b>${escapeHtml(b.room_name || "Room")}</b>
          <div class="muted">Room Type: ${escapeHtml(b.room_type || "-")}</div>
          <div>${escapeHtml(b.check_in)} → ${escapeHtml(b.check_out)}</div>
          <div>Guests: ${escapeHtml(String(b.guests || ""))}</div>
          <p><span class="status">${escapeHtml(b.status || "Pending")}</span></p>
          <div class="muted">Booking ID: ${escapeHtml(b.booking_id || "")}</div>
        </div>`
          )
          .join("")
      : "<div class='card'>No bookings found.</div>";
  } catch (e) {
    console.error("LOAD BOOKINGS ERROR:", e);
    $("myBookings").innerHTML = "<div class='error'>Could not load bookings.</div>";
  }
}

function loadProfile() {
  $("profile").innerHTML = profile
    ? `<p><b>Name:</b> ${escapeHtml(profile.displayName)}</p><p><b>LINE User ID:</b> ${escapeHtml(profile.userId)}</p>`
    : `<p><b>LINE User ID:</b> ${escapeHtml(getUserId())}</p>`;
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
