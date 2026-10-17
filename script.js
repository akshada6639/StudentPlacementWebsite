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
    element.style.color = success ? "#15803d" : "#dc2626";
}

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showSetupNotice(message) {
    const notice = document.getElementById("setupNotice");

    if (notice) {
        notice.textContent = message;
        notice.style.display = "block";
    }
}

function hideSetupNotice() {
    const notice = document.getElementById("setupNotice");

    if (notice) {
        notice.style.display = "none";
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

    document.getElementById("nameLabel").classList.toggle("hidden", !isRegister);
document.getElementById("fullName").classList.toggle("hidden", !isRegister);

document.getElementById("nameLabel").style.display = isRegister ? "block" : "none";
document.getElementById("fullName").style.display = isRegister ? "block" : "none";

    showMessage(authMessage, "");
}

document.getElementById("loginTab")?.addEventListener("click", () => {
    setAuthMode("login");
});

document.getElementById("registerTab")?.addEventListener("click", () => {
    setAuthMode("register");
});

function showDashboard(user) {
    currentUser = user;

    authView.style.display = "none";
    appView.style.display = "block";

    const userEmail = document.getElementById("userEmail");

    if (userEmail) {
        userEmail.textContent = user.email || "";
    }

    loadStudents();
}

function showLogin() {
    currentUser = null;
    students = [];

    appView.style.display = "none";
    authView.style.display = "block";

    renderStudents();
    updateDashboard();
}

async function handleAuth(event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(authMessage, "Supabase configuration is missing.");
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const submitButton = document.getElementById("authSubmit");

    submitButton.disabled = true;
    showMessage(authMessage, "Please wait...");

    try {
        if (authMode === "register") {
            if (!fullName) {
                showMessage(authMessage, "Please enter your full name.");
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            if (data.session) {
                showMessage(authMessage, "Account created successfully!", true);
            } else {
                showMessage(
                    authMessage,
                    "Registration successful! Check your email to confirm your account.",
                    true
                );
            }
        } else {
            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            showMessage(authMessage, "Login successful!", true);
        }
    } catch (error) {
        showMessage(authMessage, error.message || "Authentication failed.");
    } finally {
        submitButton.disabled = false;
    }
}

authForm?.addEventListener("submit", handleAuth);

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showToast(error.message);
        return;
    }

    showLogin();
    showToast("Logged out successfully.");
});

async function loadStudents() {
    if (!supabaseClient || !currentUser) return;

    studentRows.innerHTML =
        '<tr><td colspan="6">Loading records...</td></tr>';

    const { data, error } = await supabaseClient
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        studentRows.innerHTML =
            '<tr><td colspan="6">Could not load records.</td></tr>';

        showToast(error.message);
        return;
    }

    students = data || [];

    renderStudents();
    updateDashboard();
}

function renderStudents() {
    if (!studentRows) return;

    const searchTerm =
        document.getElementById("searchInput")?.value
            .trim()
            .toLowerCase() || "";

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
            '<tr><td colspan="6">No student records found.</td></tr>';
    } else {
        studentRows.innerHTML = filteredStudents.map(student => `
            <tr>
                <td>${escapeHTML(student.name)}</td>
                <td>${escapeHTML(student.roll_no)}</td>
                <td>${escapeHTML(student.department || "-")}</td>
                <td>${student.cgpa ?? "-"}</td>
                <td>${escapeHTML(student.status)}</td>
                <td>
                    <button type="button"
                        class="edit-btn"
                        data-edit="${student.id}">
                        Edit
                    </button>
                    <button type="button"
                        class="delete-btn"
                        data-delete="${student.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");
    }

    const recordCount = document.getElementById("recordCount");

    if (recordCount) {
        recordCount.textContent =
            `${filteredStudents.length} record(s)`;
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

studentForm?.addEventListener("submit", async event => {
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

    if (cgpa !== null && (cgpa < 0 || cgpa > 10 || !Number.isFinite(cgpa))) {
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
        document.getElementById("cancelEditBtn").style.display = "none";
        saveButton.textContent = "Save Student";

        showMessage(formMessage, "Student record saved successfully!", true);

        await loadStudents();
        showToast("Record saved successfully.");
    } catch (error) {
        showMessage(formMessage, error.message || "Could not save record.");
    } finally {
        saveButton.disabled = false;
    }
});

studentRows?.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
        editStudent(editButton.dataset.edit);
    }

    if (deleteButton) {
        await deleteStudent(deleteButton.dataset.delete);
    }
});

function editStudent(id) {
    const student = students.find(s => String(s.id) === String(id));

    if (!student) return;

    editingId = student.id;

    document.getElementById("studentId").value = student.id;
    document.getElementById("studentName").value = student.name;
    document.getElementById("rollNo").value = student.roll_no;
    document.getElementById("department").value = student.department || "";
    document.getElementById("cgpa").value = student.cgpa ?? "";
    document.getElementById("placementStatus").value = student.status;
    document.getElementById("company").value = student.company || "";

    document.getElementById("saveStudentBtn").textContent = "Update Student";
    document.getElementById("cancelEditBtn").style.display = "inline-block";

    showMessage(formMessage, "Editing student record.", true);

    studentForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
    editingId = null;

    studentForm.reset();

    document.getElementById("studentId").value = "";
    document.getElementById("saveStudentBtn").textContent = "Save Student";
    document.getElementById("cancelEditBtn").style.display = "none";

    showMessage(formMessage, "");
});

async function deleteStudent(id) {
    const student = students.find(s => String(s.id) === String(id));

    if (!student) return;

    const confirmed = confirm(
        `Delete the record for ${student.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("students")
        .delete()
        .eq("id", id);

    if (error) {
        showToast(error.message);
        return;
    }

    await loadStudents();
    showToast("Student record deleted.");
}

document.getElementById("searchInput")?.addEventListener("input", renderStudents);

document.getElementById("exportBtn")?.addEventListener("click", () => {
    const searchTerm =
        document.getElementById("searchInput")?.value
            .trim()
            .toLowerCase() || "";

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

    URL.revokeObjectURL(url);
});

async function initializeApp() {
    if (
        !SUPABASE_URL ||
        !SUPABASE_KEY ||
        SUPABASE_URL.includes("PASTE_YOUR") ||
        SUPABASE_KEY.includes("PASTE_YOUR")
    ) {
        showSetupNotice(
            "Setup required: configure your Supabase project in config.js."
        );
        showLogin();
        return;
    }

    if (!window.supabase) {
        showSetupNotice("Could not load Supabase. Check your internet connection.");
        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    hideSetupNotice();

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        showSetupNotice(error.message);
        showLogin();
        return;
    }

    if (data.session?.user) {
        showDashboard(data.session.user);
    } else {
        showLogin();
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        const resetView = document.getElementById("resetPasswordView");

        if (event === "PASSWORD_RECOVERY") {
            authView.style.display = "none";
            appView.style.display = "none";

            if (resetView) {
                resetView.classList.remove("hidden");
                resetView.style.display = "block";
            }
            return;
        }

        if (session?.user) {
            if (resetView) {
                resetView.classList.add("hidden");
                resetView.style.display = "none";
            }
            showDashboard(session.user);
        } else {
            showLogin();
        }
    });
}
supabaseClient.auth.onAuthStateChange((event, session) => {
        const resetView = document.getElementById("resetPasswordView");

        if (event === "PASSWORD_RECOVERY") {
            authView.style.display = "none";
            appView.style.display = "none";

            if (resetView) {
                resetView.classList.remove("hidden");
                resetView.style.display = "block";
            }
            return;
        }

        if (session?.user) {
            if (resetView) {
                resetView.classList.add("hidden");
                resetView.style.display = "none";
            }
            showDashboard(session.user);
        } else {
            showLogin();
        }
    });
setAuthMode("login");
initializeApp();
