// Save logged in user
function setSession(username) {
    localStorage.setItem("loggedInUser", username);
}

// Get logged in user
function getSession() {
    return localStorage.getItem("loggedInUser");
}

// Logout
function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}

// Protect page
function protectPage() {
    if (!getSession()) {
        window.location.href = "index.html";
    }
}