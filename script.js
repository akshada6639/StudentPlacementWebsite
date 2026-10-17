const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
const SUPABASE_KEY = window.SUPABASE_CONFIG?.anonKey;

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const studentForm = document.getElementById("studentForm");
const formMessage = document.getElementById("formMessage");
const studentRows = document.getElementById("studentRows");

let supabaseClient = null;
let currentUser = null;
let students = [];
let authMode = "login";
let editingId = null;

function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error-text", !success && !!message);
    element.style.color = success ? "#15803d" : "#dc2626";
}

function showToast(message, error = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3500);
}

function showSetupNotice(message) {
    const notice = document.getElementById("setupNotice");
    if (!notice) return;

    notice.classList.remove("hidden");
    notice.style.display = "block";

    const heading = notice.querySelector("h2");
    const paragraph = notice.querySelector("p");

    if (heading) heading.textContent = "Setup / Connection Error";
    if (paragraph) paragraph.textContent = message;
}

function hideSetupNotice() {
    const notice = document.getElementById("setupNotice");
    if (notice) {
        notice.classList.add("hidden");
        notice.style.display = "none";
    }
}

function showAuthView() {
    authView.classList.remove("hidden");
    authView.style.display = "grid";
}

function hideAuthView() {
    authView.classList.add("hidden");
    authView.style.display = "none";
}

function showAppView() {
    appView.classList.remove("hidden");
    appView.style.display = "block";
}

function hideAppView() {
    appView.classList.add("hidden");
    appView.style.display = "none";
}

function showResetView() {
    hideAuthView();
    hideAppView();

    const resetView = document.getElementById("resetPasswordView");

    if (resetView) {
        resetView.classList.remove("hidden");
        resetView.style.display = "grid";
    }
}

function hideResetView() {
    const resetView = document.getElementById("resetPasswordView");

    if (resetView) {
        resetView.classList.add("hidden");
        resetView.style.display = "none";
    }
}

function setAuthMode(mode) {
    authMode = mode;

    const isRegister = mode === "register";

    document.getElementById("authTitle").textContent =
        isRegister ? "Create Account" : "Welcome Back";

    document.getElementById("authSubtitle").textContent =
        isRegister
            ? "Register to manage your placement records."
            : "Login to access your placement dashboard.";

    document.getElementById("authSubmit").textContent =
        isRegister ? "Create Account" : "Login";

    document.getElementById("nameLabel").classList.toggle(
        "hidden",
        !isRegister
    );

    document.getElementById("fullName").classList.toggle(
        "hidden",
        !isRegister
    );

    document.getElementById("fullName").required = isRegister;

    document.getElementById("loginTab").classList.toggle(
        "active",
        !isRegister
    );

    document.getElementById("registerTab").classList.toggle(
        "active",
        isRegister
    );

    showMessage(authMessage, "");
}

document.getElementById("loginTab").addEventListener("click", () => {
    setAuthMode("login");
});

document.getElementById("registerTab").addEventListener("click", () => {
    setAuthMode("register");
});

function showLogin() {
    currentUser = null;
    students = [];
    editingId = null;

    hideAppView();
    hideResetView();
    showAuthView();

    renderStudents();
    updateDashboard();
}

function showDashboard(user) {
    currentUser = user;

    hideAuthView();
    hideResetView();
    showAppView();

    const userEmail = document.getElementById("userEmail");

    if (userEmail) {
        userEmail.textContent = user.email || "";
    }

    loadStudents();
}

async function handleAuth(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(
            authMessage,
            "Supabase connection is not ready. Check config.js."
        );
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = document.getElementById("authSubmit");

    if (authMode === "register" && !fullName) {
        showMessage(authMessage, "Please enter your full name.");
        return;
    }

    submitButton.disabled = true;
    showMessage(authMessage, "Please wait...");

    try {
        if (authMode === "register") {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    },
                    emailRedirectTo:
                        "https://akshada6639.github.io/StudentPlacementWebsite/"
                }
            });

            if (error) throw error;

            if (data.session) {
                showMessage(
                    authMessage,
                    "Account created successfully!",
                    true
                );
            } else {
                showMessage(
                    authMessage,
                    "Registration successful! Check your email and click the confirmation link before logging in.",
                    true
                );
            }
        } else {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            if (data.user) {
                showMessage(authMessage, "Login successful!", true);
                showDashboard(data.user);
            }
        }
    } catch (error) {
        showMessage(
            authMessage,
            error.message || "Authentication failed."
        );
    } finally {
        submitButton.disabled = false;
    }
}

authForm.addEventListener("submit", handleAuth);

document.getElementById("forgotPasswordBtn").addEventListener(
    "click",
    async () => {
        if (!supabaseClient) {
            showMessage(authMessage, "Supabase connection is not ready.");
            return;
        }

        const email = document.getElementById("email").value.trim();

        if (!email) {
            showMessage(
                authMessage,
                "Please enter your email address first."
            );
            document.getElementById("email").focus();
            return;
        }

        const button = document.getElementById("forgotPasswordBtn");
        button.disabled = true;

        showMessage(authMessage, "Sending password reset email...");

        try {
            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo:
                        "https://akshada6639.github.io/StudentPlacementWebsite/"
                });

            if (error) throw error;

            showMessage(
                authMessage,
                "If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.",
                true
            );
        } catch (error) {
            showMessage(
                authMessage,
                error.message || "Could not send password reset email."
            );
        } finally {
            button.disabled = false;
        }
    }
);

document.getElementById("resetPasswordForm").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        if (!supabaseClient) return;

        const password = document.getElementById("newPassword").value;
        const message = document.getElementById("resetPasswordMessage");
        const button = event.currentTarget.querySelector(
            'button[type="submit"]'
        );

        if (password.length < 6) {
            showMessage(message, "Password must contain at least 6 characters.");
            return;
        }

        button.disabled = true;
        showMessage(message, "Updating password...");

        try {
            const { error } = await supabaseClient.auth.updateUser({
                password
            });

            if (error) throw error;

            showMessage(
                message,
                "Password updated successfully. You can now sign in.",
                true
            );

            await supabaseClient.auth.signOut();
            document.getElementById("resetPasswordForm").reset();

            setTimeout(() => {
                showLogin();
                setAuthMode("login");
                showMessage(
                    authMessage,
                    "Password updated. Sign in with your new password.",
                    true
                );
            }, 1500);
        } catch (error) {
            showMessage(
                message,
                error.message || "Could not update password."
            );
        } finally {
            button.disabled = false;
        }
    }
);

document.getElementById("logoutBtn").addEventListener(
    "click",
    async () => {
        if (!supabaseClient) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            showToast(error.message, true);
            return;
        }

        showLogin();
        showToast("Logged out successfully.");
    }
);

async function loadStudents() {
    if (!supabaseClient || !currentUser) return;

    studentRows.innerHTML =
        '<tr><td colspan="7" class="empty-cell">Loading records...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from("students")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        students = data || [];

        renderStudents();
        updateDashboard();
    } catch (error) {
        studentRows.innerHTML =
            '<tr><td colspan="7" class="empty-cell">Could not load records.</td></tr>';

        showToast(error.message || "Could not load student records.", true);
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function renderStudents() {
    if (!studentRows) return;

    const searchTerm = (
        document.getElementById("searchInput")?.value || ""
    ).trim().toLowerCase();

    const filteredStudents = students.filter(student => {
        return [
            student.name,
            student.roll_no,
            student.department,
            student.status,
            student.company
        ].some(value =>
            String(value || "").toLowerCase().includes(searchTerm)
        );
    });

    if (filteredStudents.length === 0) {
        studentRows.innerHTML =
            '<tr><td colspan="7" class="empty-cell">No student records found.</td></tr>';
    } else {
        studentRows.innerHTML = filteredStudents.map(student => {
            const status = student.status || "Seeking";
            const statusClass = status.toLowerCase();

            return `
                <tr>
                    <td>
                        <span class="student-name">${escapeHTML(student.name)}</span>
                    </td>
                    <td>${escapeHTML(student.roll_no)}</td>
                    <td>${escapeHTML(student.department || "-")}</td>
                    <td>${student.cgpa ?? "-"}</td>
                    <td>
                        <span class="badge ${escapeHTML(statusClass)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>
                    <td>${escapeHTML(student.company || "-")}</td>
                    <td>
                        <div class="row-actions">
                            <button type="button" class="text-btn"
                                data-edit="${escapeHTML(student.id)}">Edit</button>
                            <button type="button" class="text-btn danger"
                                data-delete="${escapeHTML(student.id)}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    const recordCount = document.getElementById("recordCount");

    if (recordCount) {
        recordCount.textContent =
            `${filteredStudents.length} record(s)`;
    }
}

function updateDashboard() {
    const total = students.length;
    const placed = students.filter(s => s.status === "Placed").length;
    const seeking = students.filter(s => s.status === "Seeking").length;
    const rate = total ? Math.round((placed / total) * 100) : 0;

    document.getElementById("totalCount").textContent = total;
    document.getElementById("placedCount").textContent = placed;
    document.getElementById("seekingCount").textContent = seeking;
    document.getElementById("rateCount").textContent = `${rate}%`;
}

studentForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!supabaseClient || !currentUser) {
        showMessage(formMessage, "Please login first.");
        return;
    }

    const name = document.getElementById("studentName").value.trim();
    const rollNo = document.getElementById("rollNo").value.trim();
    const department = document.getElementById("department").value.trim();
    const cgpaValue = document.getElementById("cgpa").value;
    const status = document.getElementById("placementStatus").value;
    const company = document.getElementById("company").value.trim();

    if (!name || !rollNo) {
        showMessage(formMessage, "Name and roll number are required.");
        return;
    }

    const cgpa = cgpaValue === "" ? null : Number(cgpaValue);

    if (
        cgpa !== null &&
        (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)
    ) {
        showMessage(formMessage, "CGPA must be between 0 and 10.");
        return;
    }

    const record = {
        name,
        roll_no: rollNo,
        department,
        cgpa,
        status,
        company,
        user_id: currentUser.id
    };

    const saveButton = document.getElementById("saveStudentBtn");
    saveButton.disabled = true;

    try {
        let result;

        if (editingId !== null) {
            result = await supabaseClient
                .from("students")
                .update(record)
                .eq("id", editingId)
                .eq("user_id", currentUser.id)
                .select();
        } else {
            result = await supabaseClient
                .from("students")
                .insert(record)
                .select();
        }

        if (result.error) throw result.error;

        studentForm.reset();
        editingId = null;

        document.getElementById("studentId").value = "";
        document.getElementById("cancelEditBtn").classList.add("hidden");
        saveButton.textContent = "+ Add Student";

        showMessage(formMessage, "Student record saved successfully!", true);

        await loadStudents();
        showToast("Record saved successfully.");
    } catch (error) {
        showMessage(
            formMessage,
            error.message || "Could not save student record."
        );
    } finally {
        saveButton.disabled = false;
    }
});

studentRows.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editStudent(editButton.dataset.edit);

    if (deleteButton) {
        await deleteStudent(deleteButton.dataset.delete);
    }
});

function editStudent(id) {
    const student = students.find(s => String(s.id) === String(id));
    if (!student) return;

    editingId = student.id;

    document.getElementById("studentId").value = student.id;
    document.getElementById("studentName").value = student.name || "";
    document.getElementById("rollNo").value = student.roll_no || "";
    document.getElementById("department").value = student.department || "";
    document.getElementById("cgpa").value = student.cgpa ?? "";
    document.getElementById("placementStatus").value =
        student.status || "Seeking";
    document.getElementById("company").value = student.company || "";

    document.getElementById("saveStudentBtn").textContent = "Update Student";
    document.getElementById("cancelEditBtn").classList.remove("hidden");

    showMessage(formMessage, "Editing student record.", true);

    studentForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

document.getElementById("cancelEditBtn").addEventListener("click", () => {
    editingId = null;

    studentForm.reset();

    document.getElementById("studentId").value = "";
    document.getElementById("saveStudentBtn").textContent = "+ Add Student";
    document.getElementById("cancelEditBtn").classList.add("hidden");

    showMessage(formMessage, "");
});

async function deleteStudent(id) {
    const student = students.find(s => String(s.id) === String(id));
    if (!student || !currentUser) return;

    if (!confirm(`Delete the record for ${student.name}?`)) return;

    try {
        const { error } = await supabaseClient
            .from("students")
            .delete()
            .eq("id", id)
            .eq("user_id", currentUser.id);

        if (error) throw error;

        await loadStudents();
        showToast("Student record deleted.");
    } catch (error) {
        showToast(error.message || "Could not delete the record.", true);
    }
}

document.getElementById("searchInput").addEventListener(
    "input",
    renderStudents
);

document.getElementById("exportBtn").addEventListener("click", () => {
    const searchTerm = (
        document.getElementById("searchInput")?.value || ""
    ).trim().toLowerCase();

    const filteredStudents = students.filter(student =>
        [
            student.name,
            student.roll_no,
            student.department,
            student.status,
            student.company
        ].some(value =>
            String(value || "").toLowerCase().includes(searchTerm)
        )
    );

    if (!filteredStudents.length) {
        showToast("There are no records to export.");
        return;
    }

    const columns = [
        ["Name", "name"],
        ["Roll Number", "roll_no"],
        ["Department", "department"],
        ["CGPA", "cgpa"],
        ["Status", "status"],
        ["Company", "company"]
    ];

    const csvCell = value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
        columns.map(column => csvCell(column[0])).join(","),
        ...filteredStudents.map(student =>
            columns.map(column => csvCell(student[column[1]])).join(",")
        )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "student-placement-records.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function initializeApp() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        showSetupNotice(
            "Supabase configuration is missing. Check config.js."
        );
        showLogin();
        return;
    }

    if (!window.supabase) {
        showSetupNotice(
            "Supabase library could not load. Check your internet connection."
        );
        showLogin();
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        hideSetupNotice();

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                showResetView();
                return;
            }

            if (session?.user) {
                showDashboard(session.user);
            } else {
                showLogin();
            }
        });

        if (data.session?.user) {
            showDashboard(data.session.user);
        } else {
            showLogin();
        }
    } catch (error) {
        supabaseClient = null;

        showSetupNotice(
            error.message || "Could not connect to Supabase."
        );

        showLogin();
    }
}

setAuthMode("login");
initializeApp();
