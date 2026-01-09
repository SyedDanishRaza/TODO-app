        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
        import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyCpp1LN36tQO6oiT2I8HU1wGNJyzkIOc2g",
            authDomain: "to-do-list-app-462aa.firebaseapp.com",
            projectId: "to-do-list-app-462aa",
            storageBucket: "to-do-list-app-462aa.firebasestorage.app",
            messagingSenderId: "181132981230",
            appId: "1:181132981230:web:7465be1d4d64209b3454ff",
            measurementId: "G-MM3J32Z1M6"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // DOM Elements
        const authSection = document.getElementById('authSection');
        const taskSection = document.getElementById('taskSection');
        const authTitle = document.getElementById('authTitle');
        const authBtn = document.getElementById('authBtn');
        const toggleAuth = document.getElementById('toggleAuth');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const authError = document.getElementById('authError');
        const userEmailDisplay = document.getElementById('userEmail');
        const logoutBtn = document.getElementById('logoutBtn');
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');

        let isSignUp = false;

        // Toggle Sign In / Sign Up
        toggleAuth.addEventListener('click', () => {
            isSignUp = !isSignUp;
            authTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            toggleAuth.textContent = isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up";
        });

        // Auth Button
        authBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                showError('Please fill in both fields');
                return;
            }

            if (isSignUp) {
                createUserWithEmailAndPassword(auth, email, password)
                    .then(() => clearAuthForm())
                    .catch(error => showError(error.message));
            } else {
                signInWithEmailAndPassword(auth, email, password)
                    .then(() => clearAuthForm())
                    .catch(error => showError(error.message));
            }
        });

        function showError(msg) {
            authError.textContent = msg;
            authError.style.display = 'block';
        }

        function clearAuthForm() {
            emailInput.value = '';
            passwordInput.value = '';
            authError.style.display = 'none';
        }

        // Logout
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });

        // Auth State Observer
        onAuthStateChanged(auth, (user) => {
            if (user) {
                authSection.style.display = 'none';
                taskSection.style.display = 'block';
                userEmailDisplay.textContent = user.email;
                listenToTasks(user.uid);
            } else {
                authSection.style.display = 'block';
                taskSection.style.display = 'none';
                taskList.innerHTML = '';
            }
        });

        // Real-time listener for tasks
        function listenToTasks(uid) {
            const tasksRef = collection(db, 'users', uid, 'tasks');
            const q = query(tasksRef, orderBy('timestamp', 'desc'));

            onSnapshot(q, (snapshot) => {
                taskList.innerHTML = '';
                if (snapshot.empty) {
                    emptyState.style.display = 'block';
                } else {
                    emptyState.style.display = 'none';
                }

                snapshot.forEach((docSnap) => {
                    const task = docSnap.data();
                    const id = docSnap.id;

                    const li = document.createElement('li');
                    li.className = `list-group-item ${task.completed ? 'completed' : ''}`;

                    li.innerHTML = `
                        <span class="task-text">${task.text}</span>
                        <input type="text" class="form-control edit-input" value="${task.text}" style="display:none;">
                        <div>
                            <button class="btn btn-complete btn-sm"><i class="bi ${task.completed ? 'bi-arrow-counterclockwise' : 'bi-check-lg'}"></i></button>
                            <button class="btn btn-edit btn-sm" ${task.completed ? 'style="display:none;"' : ''}><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-save btn-sm" style="display:none;"><i class="bi bi-save"></i></button>
                            <button class="btn btn-delete btn-sm"><i class="bi bi-trash"></i></button>
                        </div>
                    `;

                    // Complete / Uncomplete
                    li.querySelector('.btn-complete').addEventListener('click', () => {
                        updateDoc(doc(db, 'users', uid, 'tasks', id), { completed: !task.completed });
                    });

                    // Edit (only show if not completed)
                    const textSpan = li.querySelector('.task-text');
                    const editInput = li.querySelector('.edit-input');
                    const editBtn = li.querySelector('.btn-edit');
                    const saveBtn = li.querySelector('.btn-save');

                    if (editBtn) {
                        editBtn.addEventListener('click', () => {
                            textSpan.style.display = 'none';
                            editInput.style.display = 'block';
                            editBtn.style.display = 'none';
                            saveBtn.style.display = 'inline-block';
                            editInput.focus();
                        });
                    }

                    saveBtn.addEventListener('click', () => {
                        const newText = editInput.value.trim();
                        if (newText && newText !== task.text) {
                            updateDoc(doc(db, 'users', uid, 'tasks', id), { text: newText });
                        }
                        textSpan.style.display = 'block';
                        editInput.style.display = 'none';
                        editBtn.style.display = 'inline-block';
                        saveBtn.style.display = 'none';
                    });

                    // Delete
                    li.querySelector('.btn-delete').addEventListener('click', () => {
                        deleteDoc(doc(db, 'users', uid, 'tasks', id));
                    });

                    taskList.appendChild(li);
                });
            });
        }

        // Add Task
        addTaskBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user || !taskInput.value.trim()) return;

            addDoc(collection(db, 'users', user.uid, 'tasks'), {
                text: taskInput.value.trim(),
                completed: false,
                timestamp: serverTimestamp()
            }).then(() => {
                taskInput.value = '';
            });
        });

        // Enter key to add task
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTaskBtn.click();
        });