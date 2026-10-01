// Global State Variables
let currentLiffUserId = localStorage.getItem("line_user_id") || "";

// 1. LIFF Initialization (config.js မှ LIFF_ID ကို ယူသုံးထားပါသည်)
document.addEventListener("DOMContentLoaded", async () => {
  // config.js ထဲရှိ CONFIG.LIFF_ID သို့မဟုတ် LIFF_ID ကို ယူခြင်း
  const liffId = (typeof CONFIG !== "undefined" && CONFIG.LIFF_ID) 
                 ? CONFIG.LIFF_ID 
                 : (typeof LIFF_ID !== "undefined" ? LIFF_ID : "");

  if (typeof liff !== "undefined" && liffId) {
    try {
      await liff.init({ liffId: liffId });
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        currentLiffUserId = profile.userId;
        
        // LocalStorage ထဲသို့ User ID ကို အမြဲတမ်း သိမ်းထားခြင်း
        localStorage.setItem("line_user_id", currentLiffUserId);
        console.log("LIFF User ID Saved:", currentLiffUserId);
      } else {
        liff.login();
      }
    } catch (err) {
      console.error("LIFF Init Error:", err);
    }
  } else {
    console.warn("LIFF ID or LIFF SDK not found. Using cached User ID.");
  }

  // Event Listeners စတင်ခြင်း
  initEventListeners();
});

// 2. Event Listeners Setup
function initEventListeners() {
  const needInvoiceCheckbox = document.getElementById("need_invoice");
  const invoiceFields = document.getElementById("invoice_fields");

  if (needInvoiceCheckbox && invoiceFields) {
    needInvoiceCheckbox.addEventListener("change", (e) => {
      invoiceFields.style.display = e.target.checked ? "block" : "none";
    });
  }

  const bookingForm = document.getElementById("booking_form") || document.querySelector("form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  } else {
    const submitBtn = document.getElementById("submit_btn") || document.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.addEventListener("click", handleBookingSubmit);
    }
  }
}

// 3. Form Submit Handler (Webhook Call)
async function handleBookingSubmit(event) {
  if (event) event.preventDefault();

  // LocalStorage မှ User ID ကို ပြန်ယူခြင်း (Page ပြန်ဖွင့်လျှင်လည်း မပျောက်ပါ)
  const userIdToSend = currentLiffUserId || localStorage.getItem("line_user_id") || "WEB_TEST_USER";
  const needInvoiceEl = document.getElementById("need_invoice");
  const needInvoice = needInvoiceEl ? needInvoiceEl.checked : false;

  const bookingData = {
    user_id: userIdToSend,
    customer_name: getValueById("customer_name") || getValueById("name"),
    phone: getValueById("phone") || getValueById("tel"),
    room_id: getValueById("room_id") || "ROOM_01",
    room_name: getValueById("room_name") || "-",
    room_type: getValueById("room_type") || "-",
    check_in: getValueById("check_in") || getValueById("checkin"),
    check_out: getValueById("check_out") || getValueById("checkout"),
    guests: getValueById("guests") || "1",
    price: getValueById("price") || "-",
    note: getValueById("note") || "-",
    need_invoice: needInvoice,
    company_name: needInvoice ? (getValueById("company_name") || getValueById("company")) : "",
    tax_id: needInvoice ? (getValueById("tax_id") || getValueById("tax")) : "",
    billing_address: needInvoice ? (getValueById("billing_address") || getValueById("address")) : ""
  };

  // Webhook URL ကို config.js မှယူမည် သို့မဟုတ် Default URL သုံးမည်
  const webhookUrl = (typeof CONFIG !== "undefined" && CONFIG.WEBHOOK_URL) 
    ? CONFIG.WEBHOOK_URL 
    : "https://sage-loon.pikapod.net/webhook/cpark-booking";

  try {
    showLoading(true);
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();
    showLoading(false);

    if (result.success) {
      alert("Booking Successful! ID: " + (result.booking_id || ""));
      if (typeof liff !== "undefined" && liff.isInClient()) {
        liff.closeWindow();
      }
    } else {
      alert("Booking Failed: " + (result.message || "Unknown error"));
    }
  } catch (error) {
    showLoading(false);
    console.error("Booking Submission Error:", error);
    alert("Error submitting booking. Please check connection.");
  }
}

// Helper Functions
function getValueById(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function showLoading(isLoading) {
  const loader = document.getElementById("loading_spinner") || document.getElementById("loader");
  if (loader) {
    loader.style.display = isLoading ? "block" : "none";
  }
}
