// Demo credentials (in real app, this would be server-side authentication)
 
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    
    try {
        const res = await fetch("https://safepasig-backend.onrender.com/admin/admin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.message || "Login Failed");
        }

        localStorage.setItem("adminToken", data.token);

        window.location.href = "authDashboard.html";

    } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.classList.add("show");
        setTimeout(() => errorMsg.classList.remove("show"), 3000);
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const successMsg = document.getElementById('successMessage');

    try {
        const res = await fetch("https://safepasig-backend.onrender.com/admin/reset-request-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        successMsg.textContent = "Reset Link sent to your email";
        successMsg.classList.add("show");

        document.getElementById("resetEmail").value = '';
    } catch (error) {
        alert(error.message);
    }
    
}

function showForgotPassword(event) {
    if (event) event.preventDefault();
    
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('active');
}

function showLoginForm(event) {
    if (event) event.preventDefault();
    
    document.getElementById('forgotForm').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    
    // Clear any messages
    document.getElementById('successMessage').classList.remove('show');
    document.getElementById('loginError').classList.remove('show');
}