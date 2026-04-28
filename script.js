// script.js — Updated to use MySQL via PHP API instead of localStorage

// ── API base paths (adjust if your folder name differs) ──────
const API = {
    bookings:  "/gymnatorium/api/bookings.php",
    inquiries: "/gymnatorium/api/inquiries.php",
};

// ── Admin access control ─────────────────────────────────────
if (window.location.pathname.includes("admin.html")) {
    if (sessionStorage.getItem("isAdmin") !== "true") {
        alert("🚫 Access denied! Please login first.");
        window.location.href = "login.html";
    }
}

// ── Login / Logout ───────────────────────────────────────────
function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value;

    if (u === "admin" && p === "1234") {
        sessionStorage.setItem("isAdmin", "true");
        alert("✅ Login successful!");
        window.location.href = "admin.html";
    } else {
        alert("❌ Invalid credentials!");
    }
}

function logout() {
    if (confirm("Logout?")) {
        sessionStorage.removeItem("isAdmin");
        window.location.href = "login.html";
    }
}

// ── Helpers ──────────────────────────────────────────────────
function convertTo12Hour(time) {
    if (!time) return "—";
    const [h, m] = time.split(':').map(Number);
    return `${(h % 12 || 12).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text ? text.replace(/[&<>"']/g, c => map[c]) : "";
}

function calcDuration(timeIn, timeOut) {
    if (!timeIn || !timeOut) return "—";
    const [ih, im] = timeIn.split(':').map(Number);
    const [oh, om] = timeOut.split(':').map(Number);
    let mins = (oh * 60 + om) - (ih * 60 + im);
    if (mins < 0) mins += 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Stats bar ────────────────────────────────────────────────
async function updateStats() {
    const el = document.getElementById("statsBar");
    if (!el) return;

    const bookings = await fetch(API.bookings).then(r => r.json()).catch(() => []);
    const guests   = bookings.reduce((s, b) => s + b.guests, 0);
    const days     = bookings.reduce((s, b) => s + b.days,   0);

    el.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-label">Total Bookings</div>
            <div class="stat-value">${bookings.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-label">Total Guests</div>
            <div class="stat-value">${guests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-label">Total Days</div>
            <div class="stat-value">${days}</div>
        </div>
    `;
}

// ── Display bookings table (admin) ───────────────────────────
async function displayBookings() {
    const tbody = document.querySelector("#bookingTable tbody");
    if (!tbody) return;

    const bookings = await fetch(API.bookings).then(r => r.json()).catch(() => []);
    tbody.innerHTML = "";

    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.style.display = bookings.length ? "none" : "block";

    bookings.forEach(bk => {
        const checkIn  = new Date(bk.checkIn).toLocaleDateString();
        const checkOut = new Date(bk.checkOut).toLocaleDateString();
        const singleDay = bk.days === 1 && bk.timeIn && bk.timeOut;

        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(bk.name)}</td>
                <td>${escapeHtml(bk.email)}</td>
                <td>${escapeHtml(bk.phone)}</td>
                <td>${escapeHtml(bk.event)}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${singleDay ? convertTo12Hour(bk.timeIn)  : "—"}</td>
                <td>${singleDay ? convertTo12Hour(bk.timeOut) : "—"}</td>
                <td><strong>${singleDay ? calcDuration(bk.timeIn, bk.timeOut) : "—"}</strong></td>
                <td style="text-align:center;font-weight:700">${bk.guests}</td>
                <td style="text-align:center;font-weight:700">${bk.days}</td>
            </tr>
        `;
    });

    displayDeleteTable(bookings);
}

// ── Delete table (admin) ─────────────────────────────────────
function displayDeleteTable(bookings) {
    const tbody = document.querySelector("#deleteTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    bookings.forEach(bk => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(bk.name)}</td>
                <td>
                    <button class="btn btn-small btn-danger" onclick="deleteBooking(${bk.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function deleteBooking(id) {
    if (!confirm("Delete this booking?")) return;
    await fetch(`${API.bookings}?id=${id}`, { method: 'DELETE' });
    await updateStats();
    await displayBookings();
}

// ── Booking form (client/index.html) ─────────────────────────
function setupBookingPage() {
    const form = document.getElementById("bookingForm");
    if (!form) return;

    // Show/hide "Other event" text field
    const eventSelect = document.getElementById("eventType");
    const otherField  = document.getElementById("otherEventField");
    if (eventSelect && otherField) {
        eventSelect.addEventListener("change", () => {
            otherField.style.display = eventSelect.value === "Other" ? "block" : "none";
        });
    }

    // Show time fields only for single-day bookings
    const checkInEl  = document.getElementById("checkIn");
    const checkOutEl = document.getElementById("checkOut");
    const timeFields = document.getElementById("timeFields");

    function checkSingleDay() {
        if (!checkInEl.value || !checkOutEl.value || !timeFields) return;
        const diff = (new Date(checkOutEl.value) - new Date(checkInEl.value)) / 86400000;
        timeFields.style.display = diff === 0 ? "block" : "none";
    }
    if (checkInEl)  checkInEl.addEventListener("change",  checkSingleDay);
    if (checkOutEl) checkOutEl.addEventListener("change", checkSingleDay);

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const first    = document.getElementById("firstName").value.trim();
        const last     = document.getElementById("lastName").value.trim();
        const email    = document.getElementById("email").value.trim();
        const phone    = document.getElementById("phone").value.trim();
        let   event    = document.getElementById("eventType").value;
        const checkIn  = document.getElementById("checkIn").value;
        const checkOut = document.getElementById("checkOut").value;
        const guests   = document.getElementById("guests").value;
        const timeIn   = document.getElementById("timeIn")?.value  || null;
        const timeOut  = document.getElementById("timeOut")?.value || null;

        if (event === "Other") {
            event = document.getElementById("otherEventType")?.value.trim() || "Other";
        }

        if (!first || !last || !email || !phone || !event || !checkIn || !checkOut || !guests) {
            alert("Please fill in all required fields!");
            return;
        }

        const diff = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));

        const payload = { name: `${first} ${last}`, email, phone, event, checkIn, checkOut, timeIn, timeOut, guests: parseInt(guests), days: diff };

        const res = await fetch(API.bookings, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        if (res.ok) {
            alert("✅ Booking confirmed!");
            form.reset();
            if (timeFields) timeFields.style.display = "none";
        } else if (res.status === 409) {
            const err = await res.json();
            const c = err.conflictWith;
            const dateStr = c.checkIn === c.checkOut
                ? c.checkIn
                : c.checkIn + " to " + c.checkOut;
            const timeStr = c.timeIn
                ? " (Time: " + convertTo12Hour(c.timeIn) + " - " + convertTo12Hour(c.timeOut) + ")"
                : "";
            alert("❌ Date already booked!\n\nConflicts with: " + c.name + "\nDate: " + dateStr + timeStr + "\n\nPlease choose a different date or time.");
        } else {
            const err = await res.json();
            alert("❌ Error: " + (err.error || "Something went wrong."));
        }
    });
}

// ── Contact form (client/index.html) ─────────────────────────
function setupContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const name    = document.getElementById("contactName").value.trim();
        const email   = document.getElementById("contactEmail").value.trim();
        const phone   = document.getElementById("contactPhone").value.trim();
        const type    = document.getElementById("inquiryType").value;
        const message = document.getElementById("contactMessage").value.trim();

        if (!name || !email || !phone || !type || !message) {
            alert("Please fill in all fields!");
            return;
        }

        const res = await fetch(API.inquiries, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, email, phone, type, message }),
        });

        if (res.ok) {
            alert("✅ Message sent! We'll get back to you soon.");
            form.reset();
        } else {
            alert("❌ Failed to send message. Please try again.");
        }
    });
}

// ── Inquiries table (admin) ──────────────────────────────────
async function populateInquiriesTable() {
    const tbody = document.querySelector("#inquiriesTable tbody");
    if (!tbody) return;

    const inquiries = await fetch(API.inquiries).then(r => r.json()).catch(() => []);
    tbody.innerHTML = "";

    const emptyState = document.getElementById("emptyInquiriesState");
    if (emptyState) emptyState.style.display = inquiries.length ? "none" : "block";

    inquiries.forEach(inq => {
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(inq.name)}</td>
                <td>${escapeHtml(inq.email)}</td>
                <td>${escapeHtml(inq.phone)}</td>
                <td><span style="background:var(--bg-light);padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600">${escapeHtml(inq.type)}</span></td>
                <td title="${escapeHtml(inq.message)}">${escapeHtml(inq.message.substring(0, 50))}${inq.message.length > 50 ? '…' : ''}</td>
                <td>${escapeHtml(inq.date)}</td>
                <td><button class="btn btn-small btn-danger" onclick="deleteInquiry(${inq.id})">Delete</button></td>
            </tr>
        `;
    });
}

async function deleteInquiry(id) {
    if (!confirm("Delete this inquiry?")) return;
    await fetch(`${API.inquiries}?id=${id}`, { method: 'DELETE' });
    await populateInquiriesTable();
}

// ── Booked Schedule (public view on index.html) ──────────────
async function displaySchedule() {
    const el = document.getElementById("scheduleContent");
    if (!el) return;

    const bookings = await fetch(API.bookings).then(r => r.json()).catch(() => []);

    if (!bookings.length) {
        el.innerHTML = `<p class="text-center" style="color:var(--text-muted)">No bookings yet.</p>`;
        return;
    }

    const rows = bookings.map(bk => `
        <tr>
            <td>${escapeHtml(bk.name)}</td>
            <td>${escapeHtml(bk.event)}</td>
            <td>${new Date(bk.checkIn).toLocaleDateString()}</td>
            <td>${new Date(bk.checkOut).toLocaleDateString()}</td>
            <td style="text-align:center">${bk.guests}</td>
        </tr>
    `).join('');

    el.innerHTML = `
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th>Name</th><th>Event</th>
                        <th>Check-In</th><th>Check-Out</th><th>Guests</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await updateStats();
    await displayBookings();
    await populateInquiriesTable();
    await displaySchedule();
    setupBookingPage();
    setupContactForm();
});