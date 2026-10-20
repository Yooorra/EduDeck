/* EduDeck - Login & Register */

/* 1. SETTINGS */

// false = accounts are saved in the browser (localStorage), good for testing
// true = uses the Python + SQLite backend (Flask has to be running!)
const USE_SQLITE_BACKEND = false;
const BACKEND_BASE_URL = 'http://127.0.0.1:5000';

/* 2. GRAB EVERYTHING FROM THE PAGE */
const tabLoginBtn = document.getElementById('tab-login-btn');
const tabRegisterBtn = document.getElementById('tab-register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authSubtitle = document.getElementById('auth-subtitle');
const authAlert = document.getElementById('auth-alert');

const switchToRegisterLink = document.getElementById('switch-to-register');
const switchToLoginLink = document.getElementById('switch-to-login');

// login inputs
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');

// register inputs
const regNameInput = document.getElementById('reg-name');
const regUsernameInput = document.getElementById('reg-username');
const regPasswordInput = document.getElementById('reg-password');
const regConfirmPasswordInput = document.getElementById('reg-confirm-password');

/* 3. SWITCH BETWEEN SIGN IN AND REGISTER */
function showLoginForm() {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    authSubtitle.textContent = 'Sign in to access your dashboard';
    hideAlert();
}

function showRegisterForm() {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    authSubtitle.textContent = 'Create a new student account';
    hideAlert();
}

tabLoginBtn.addEventListener('click', showLoginForm);
tabRegisterBtn.addEventListener('click', showRegisterForm);
switchToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

/* 4. THE RED / GREEN MESSAGE BOX */
// type is 'error' (red) or 'success' (green)
function showAlert(message, type = 'error') {
    authAlert.textContent = message;
    authAlert.className = 'auth-alert ' + type;
}

function hideAlert() {
    authAlert.textContent = '';
    authAlert.className = 'auth-alert';
}

/* 5. TEMPORARY STORAGE (browser localStorage) */
const USERS_STORAGE_KEY = 'edudeck_registered_users';

// gets all saved accounts. If there are none yet, it makes a demo account
function getLocalUsers() {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);

    if (!raw) {
        const defaultUsers = [
            { name: 'John Smith', username: '2024-0001', password: 'password123' }
        ];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
        return defaultUsers;
    }
    return JSON.parse(raw);
}

function saveLocalUser(newUser) {
    const users = getLocalUsers();
    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

/* 6. LOGIN */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();   // stops the page from refreshing
    hideAlert();

    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
        showAlert('Please enter both student ID and password.');
        return;
    }

    if (USE_SQLITE_BACKEND) {
        await loginWithBackend(username, password);
    } else {
        loginWithLocalStorage(username, password);
    }
});

function loginWithLocalStorage(username, password) {
    const users = getLocalUsers();
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!foundUser) {
        showAlert('Student ID not found. Please register first or use the demo ID.');
        return;
    }

    if (foundUser.password !== password) {
        showAlert('Incorrect password. Please try again.');
        return;
    }

    // remember who is logged in (the dashboard reads this)
    localStorage.setItem('currentUser', JSON.stringify({
        name: foundUser.name,
        username: foundUser.username
    }));

    showAlert(`Welcome back, ${foundUser.name}! Opening dashboard...`, 'success');

    // small wait so the user can see the message
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 800);
}

/* 7. REGISTER */
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name = regNameInput.value.trim();
    const username = regUsernameInput.value.trim();
    const password = regPasswordInput.value;
    const confirmPassword = regConfirmPasswordInput.value;

    if (!name || !username || !password) {
        showAlert('Please fill in all required fields.');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match. Please re-type carefully.');
        return;
    }

    if (password.length < 4) {
        showAlert('Password should be at least 4 characters long.');
        return;
    }

    if (USE_SQLITE_BACKEND) {
        await registerWithBackend(name, username, password);
    } else {
        registerWithLocalStorage(name, username, password);
    }
});

function registerWithLocalStorage(name, username, password) {
    const users = getLocalUsers();
    const alreadyExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());

    if (alreadyExists) {
        showAlert('That Student ID / Username is already registered. Please sign in instead.');
        return;
    }

    saveLocalUser({ name, username, password });

    showAlert('Account created successfully! You can now sign in.', 'success');

    // go back to the sign in tab with the username already typed
    setTimeout(() => {
        showLoginForm();
        loginUsernameInput.value = username;
        loginPasswordInput.value = '';
        loginPasswordInput.focus();
    }, 1000);
}

/* 8. PYTHON + SQLITE VERSION (only used when USE_SQLITE_BACKEND is true) */

// talks to @app.route('/api/login') in Python
async function loginWithBackend(username, password) {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify({
                name: data.name,
                username: data.username
            }));
            showAlert(`Welcome, ${data.name}! Redirecting...`, 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            showAlert(data.message || 'Login failed.');
        }
    } catch (err) {
        showAlert('Cannot connect to Python server. Is Flask running on port 5000?');
        console.error(err);
    }
}

// talks to @app.route('/api/register') in Python
async function registerWithBackend(name, username, password) {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Registration successful! Please sign in.', 'success');
            setTimeout(() => {
                showLoginForm();
                loginUsernameInput.value = username;
                loginPasswordInput.focus();
            }, 1000);
        } else {
            showAlert(data.message || 'Registration failed.');
        }
    } catch (err) {
        showAlert('Cannot connect to Python server. Is Flask running on port 5000?');
        console.error(err);
    }
}
