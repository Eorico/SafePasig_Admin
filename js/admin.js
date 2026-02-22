// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.classList.contains('logout-btn')) return;

        e.preventDefault();

        // Update active nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Show corresponding section
        const sectionId = this.dataset.section;
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    });
});

let reports = [];

// Logout function
function logout() {
    localStorage.removeItem("adminToken");
    window.location.href = "index.html";
}

function renderMediaPreview(url) {
    if (!url.startsWith('http')) {
        url = url.startsWith('uploads/') 
            ? "https://safepasig-backend.onrender.com/" + url 
            : "https://safepasig-backend.onrender.com/uploads/" + url;
    }

    const videoExtensions = /\.(mp4|webm|ogg)$/i;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

    if (videoExtensions.test(url)) {
        return `
        <video 
            src="${url}" 
            width="80" 
            style="cursor:pointer;border-radius:6px; display:block;" 
            onclick="openMedia('${url}', 'video')"
            preload="metadata"
            controls
        ></video>`;
    } else if (imageExtensions.test(url)) {
        return `
        <img 
            src="${url}" 
            width="80" 
            style="cursor:pointer;border-radius:6px"
            onclick="openMedia('${url}', 'image')">`;
    } else {
        return "No Media";
    }
}

function openMedia(url, type) {
    const modal = document.getElementById("mediaModal");
    const content = document.getElementById("mediaContent");

    if (type === "video") {
        // Create a new video element
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '90%';
        video.style.maxHeight = '80vh';
        video.style.borderRadius = '6px';
        video.preload = 'auto'; // Ensure video data loads
        video.muted = false;    // Optional: remove muted if you want sound

        // Wait for enough data to display first frame
        video.addEventListener('loadeddata', () => {
            video.play(); // Play when first frame is loaded
        });

        content.innerHTML = ''; // Clear previous content
        content.appendChild(video);

    } else {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '90%';
        img.style.maxHeight = '80vh';
        img.style.borderRadius = '6px';

        content.innerHTML = ''; // Clear previous content
        content.appendChild(img);
    }

    modal.classList.add("active");
}


function closeMedia() {
    const modal = document.getElementById("mediaModal");
    const content = document.getElementById("mediaContent");
    modal.classList.remove("active");
    content.innerHTML = "";
}

// Load Reports
async function loadReports() {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        logout();
        return;
    }

    try {
        const res = await fetch("https://safepasig-backend.onrender.com/admin/reports", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }

        reports = await res.json();
        populateTable();
    } catch (err) {
        console.error("Error loading reports:", err);
        logout();
    }
}

// Populate Table
function populateTable(filter = 'all') {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';

    const filteredData =
        filter === 'all'
            ? reports
            : reports.filter(r => r.status.toLowerCase() === filter.toLowerCase());

    console.log("Reports to display:", filteredData); // debug

    filteredData.forEach(item => {
        const row = document.createElement('tr');

        let statusClass = '';
        switch(item.status.toLowerCase()) {
            case 'true': statusClass = 'status-true'; break;
            case 'false': statusClass = 'status-fake'; break;
            case 'pending': statusClass = 'status-pending'; break;
            default: statusClass = 'status-pending';
        }

        row.innerHTML = `
            <td>${item._id}</td>
            <td>${item.deviceId}</td>
            <td>${item.barangay}</td>
            <td>${item.isPWD ? "PWD" : "Normal"}</td>
            <td>${item.type}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${item.status}
                </span>
            </td>
            <td>${new Date(item.createdAt).toLocaleString()}</td>
            <td>
                ${item.mediaUrl ? renderMediaPreview(item.mediaUrl) : "No Media"}
            </td>
            <td>
                <button onclick="updateStatus('${item._id}', 'True')">True</button>
                <button onclick="updateStatus('${item._id}', 'False')">Fake</button>
                <button onclick="deleteReport('${item._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update Status
async function updateStatus(reportId, newStatus) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        logout();
        return;
    }

    try {
        // Find the report in the local array
        const report = reports.find(r => r._id === reportId);
        if (!report) return;

        let statusToSend = newStatus;

        // Flip Pending to True/Fake if needed
        if (report.status.toLowerCase() === 'pending') {
            statusToSend = newStatus;
        }

        // Optimistically update UI
        report.status = statusToSend;
        updateTableRow(reportId, statusToSend);

        // Send update to server
        await fetch(`https://safepasig-backend.onrender.com/admin/reports/${reportId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ status: statusToSend })
        });

    } catch (err) {
        console.error("Error updating status:", err);
    }
}


function updateTableRow(reportId, status) {
    // Get all rows
    const rows = document.querySelectorAll('#data-table-body tr');

    rows.forEach(row => {
        // Check the first cell for matching reportId
        const firstCell = row.cells[0];
        if (firstCell && firstCell.textContent === reportId) {

            // Determine badge class
            let statusClass = '';
            switch(status.toLowerCase()) {
                case 'true': statusClass = 'status-true'; break;
                case 'fake': statusClass = 'status-fake'; break;
                case 'pending': statusClass = 'status-pending'; break;
            }

            // Update the badge
            const badge = row.querySelector('.status-badge');
            if (badge) {
                badge.textContent = status;
                badge.className = 'status-badge ' + statusClass;
            }
        }
    });
}

async function deleteReport(reportId) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        logout();
        return;
    }

    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
        const res = await fetch(`https://safepasig-backend.onrender.com/admin/reports/${reportId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        // Read JSON even if status is not 200
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
            alert("Report deleted successfully.");

            // Reload the entire page
            window.location.reload();
        } else {
            console.error("Server response:", data);
            alert("Failed to delete report.");
            window.location.reload();
        }
    } catch (err) {
        console.error("Error deleting report:", err);
        alert("Failed to delete report.");
    }
}

// Filter data
function filterData(filter, event) {
    // Remove 'active' from all toggle buttons
    document.querySelectorAll('#admin-view .toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add 'active' to the clicked button
    if (event) event.target.classList.add('active');

    // Populate table with filtered data
    // 'all' shows all reports, 'true' shows true reports, 'false' shows false reports
    populateTable(filter);
}


// Line Chart
let currentPeriod = 'weekly';
let chartData = {};

function drawLineChart() {
    const canvas = document.getElementById('chart3d');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    const data = chartData[currentPeriod];
    if (!data) return;

    const maxValue = Math.max(...data.trueReports, ...data.falseReports);
    const points = data.labels.length;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px JetBrains Mono';
        ctx.textAlign = 'right';
        const value = Math.round(maxValue - (maxValue / 5) * i);
        ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Syne';
    ctx.textAlign = 'center';
    data.labels.forEach((label, i) => {
        const x = padding + (chartWidth / (points - 1)) * i;
        ctx.fillText(label, x, height - padding + 25);
    });

    // Draw lines
    function drawLine(values, color) {
        const coords = values.map((v, i) => ({
            x: padding + (chartWidth / (points - 1)) * i,
            y: padding + chartHeight - (v / maxValue) * chartHeight
        }));

        // Fill area
        ctx.beginPath();
        ctx.moveTo(coords[0].x, height - padding);
        coords.forEach(c => ctx.lineTo(c.x, c.y));
        ctx.lineTo(coords[coords.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fillStyle = color + '20';
        ctx.fill();

        // Draw line
        ctx.beginPath();
        coords.forEach((c, i) => i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y));
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw points
        coords.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    drawLine(data.trueReports, '#00d9ff');
    drawLine(data.falseReports, '#ef4444');
}

// Load chart data
async function loadChartData(period) {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        logout();
        return;
    }

    try {
        const res = await fetch("https://safepasig-backend.onrender.com/admin/reports/data-chart", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        chartData = await res.json();
        currentPeriod = period || 'weekly';
        drawLineChart();
    } catch (err) {
        console.error("Error loading chart data:", err);
    }
}

// Update chart period and redraw chart with corresponding data
async function updateChart(period, event) {
    // Remove 'active' from all chart toggle buttons
    document.querySelectorAll('#statistics .toggle-btn').forEach(btn => btn.classList.remove('active'));

    // Add 'active' to the clicked button
    if (event) event.target.classList.add('active');

    const token = localStorage.getItem("adminToken");
    if (!token) {
        logout();
        return;
    }

    try {
        // Fetch chart data from backend for the selected period
        const res = await fetch("https://safepasig-backend.onrender.com/admin/reports/data-chart", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        chartData = await res.json();
        currentPeriod = period;
        drawLineChart(); // redraw chart with new period data
    } catch (err) {
        console.error("Error updating chart:", err);
    }
}

// Event listener for window resize
window.addEventListener('resize', drawLineChart);

// Initialize
loadReports();
loadChartData();
