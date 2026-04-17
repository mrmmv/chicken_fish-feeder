// DOM Elements - Forms
const loginBox = document.getElementById('login-box');
const signupBox = document.getElementById('signup-box');
const forgotBox = document.getElementById('forgot-box');

// DOM Elements - Triggers
const showSignupBtn = document.getElementById('show-signup-btn');
const showForgotLink = document.getElementById('show-forgot-link');
const showLoginLink1 = document.getElementById('show-login-link-1');
const showLoginLink2 = document.getElementById('show-login-link-2');

// Initialize Firebase Auth
const auth = firebase.auth();

// UI Navigation Functions
function hideAllBoxes() {
    loginBox.style.display = 'none';
    signupBox.style.display = 'none';
    forgotBox.style.display = 'none';
}

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllBoxes();
    signupBox.style.display = 'block';
});

showForgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllBoxes();
    forgotBox.style.display = 'block';
});

showLoginLink1.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllBoxes();
    loginBox.style.display = 'block';
});

showLoginLink2.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllBoxes();
    loginBox.style.display = 'block';
});

// Firebase Authentication Logic

// 1. Log In
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            console.log("Logged in successfully:", userCredential.user);
            // Redirect to dashboard
            window.location.href = 'index.html'; // Assuming index.html is the UI dashboard
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// 2. Sign Up
document.getElementById('signup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed up
            console.log("Signed up successfully:", userCredential.user);
            alert("Account created successfully!");
            // Redirect to dashboard
            window.location.href = 'index.html'; 
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// 3. Forgot Password / Reset
document.getElementById('forgot-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("Password reset email sent! Please check your inbox.");
            hideAllBoxes();
            loginBox.style.display = 'block';
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, automatically redirect to dashboard
        // window.location.href = 'index.html';
        
        // Uncomment the line above to enforce automatic redirection.
        // Left commented during testing so you can see the login page.
    }
});
