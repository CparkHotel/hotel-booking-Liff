// Global State Variables
let currentLiffUserId = "";
let selectedRoom = null;
let currentStep = 1;

// 1. LIFF Initialization & User ID Persistence
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // ⚠️ Replace 'YOUR_LIFF_ID' with your actual LIFF ID if needed
    if (typeof liff !== "undefined") {
     await liff.init({ liffId: "2011476453-A8K9qAG9" });
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        currentLiffUserId = profile.userId;
        
        // LocalStorage ထဲတွင် User ID ကို အမြဲတမ်း သိမ်းဆည်းထားခြင်း
        localStorage.setItem("line_user_id", currentLiffUserId);
        console.log("LIFF User ID Saved:", currentLiffUserId);
      } else {
        liff.login();
      }
    } else {
      // LocalStorage မှ ID ကို ပြန်ယူခြင်း (LIFF အပြင်ဘက် Test လုပ်ချိန်အတွက်)
      currentLiffUserId = localStorage.getItem("line_user_id") || "WEB_TEST_USER";
    }
  } catch (error) {
    console.error("LIFF Init Error:", error);
    currentLiffUserId = localStorage.getItem("line_user_id") || "WEB_TEST_USER";
  }

  // Initial Setup
  initEventListeners();
});

// 2. Event Listeners Setup
function initEventListeners() {
  const needInvoiceCheckbox = document.getElementById("need_invoice");
  if (needInvoiceCheckbox) {
    needInvoiceCheckbox.addEventListener("change", (e) => {
      const invoiceFields = document.getElementById("invoice_fields");
      if (invoiceFields) {
        invoiceFields.style.display = e.target.checked ? "block" : "none";
      }
    });
  }

  const bookingForm = document.getElementById("booking_form") || document.querySelector("form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }
}

// 3. Form Submit Handler (Webhook Call)
async function handleBookingSubmit(event) {
  event.preventDefault();

  // LocalStorage မှ User ID ကို ပြန်ဆွဲထုတ်ခြင်း (Page ပြန်ဖွင့်လျှင်လည်း ID မပျောက်ပါ)
  const userIdToSend = currentLiffUserId || localStorage.getItem("line_user_id") || "WEB_TEST_USER";

  const needInvoice = document.getElementById("need_invoice") ? document.getElementById("need_invoice").checked : false;

  // Webhook ထံ ပို့မည့် Payload Data
  const bookingData = {
    user_id: userIdToSend, // 🟢 user_id ကို မပါမဖြစ် ထည့်သွင်းထားသည်
    customer_name: getValueById("customer_name"),
    phone: getValueById("phone"),
    room_id: getValueById("room_id") || (selectedRoom ? selectedRoom.id : "-"),
    room_name: getValueById("room_name") || (selectedRoom ? selectedRoom.name : "-"),
    room_type: getValueById("room_type") || (selectedRoom ? selectedRoom.type : "-"),
    check_in: getValueById("check_in"),
    check_out: getValueById("check_out"),
    guests: getValueById("guests"),
    price: getValueById("price") || (selectedRoom ? selectedRoom.price : "-"),
    note: getValueById("note"),
    need_invoice: needInvoice,
    
    // User ရိုက်ထည့်ထားသည့် Invoice အချက်အလက်များ (မရိုက်ပါက အလွတ်ဖြစ်မည်)
    company_name: needInvoice ? getValueById("company_name") : "",
    tax_id: needInvoice ? getValueById("tax_id") : "",
    billing_address: needInvoice ? getValueById("billing_address") : ""
  };

  try {
    showLoading(true);
    
    // ⚠️ Replace with your actual n8n Webhook URL
    const response = await fetch("https://sage-loon.pikapod.net/webhook/cpark-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();
    showLoading(false);

    if (result.success) {
      alert("Booking submitted successfully! Booking ID: " + (result.booking_id || ""));
      if (typeof liff !== "undefined" && liff.isInClient()) {
        liff.closeWindow();
      }
    } else {
      alert("Booking Failed: " + (result.message || "Unknown error"));
    }
  } catch (error) {
    showLoading(false);
    console.error("Booking Submission Error:", error);
    alert("Error submitting booking. Please try again.");
  }
}

// Helper Functions
function getValueById(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function showLoading(isLoading) {
  const loader = document.getElementById("loading_spinner");
  if (loader) {
    loader.style.display = isLoading ? "block" : "none";
  }
}
