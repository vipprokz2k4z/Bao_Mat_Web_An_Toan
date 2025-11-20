import { useEffect, useMemo, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

const tabs = [
  { id: "login", label: "Đăng nhập" },
  { id: "register", label: "Đăng ký" },
  { id: "demo", label: "Admin & Mass Assignment" },
];

const pretty = (data) =>
  data ? JSON.stringify(data, null, 2) : "Chưa có dữ liệu. Gửi request để xem phản hồi.";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

const sectionTitle = "text-xl font-semibold text-slate-900";

const helperText = "text-sm text-slate-500";

const request = async (path, { method = "POST", body } = {}) => {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined && method !== "GET") {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed (${res.status})`);
    error.details = data;
    throw error;
  }

  return data;
};

function App() {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({
    email: "demo@example.com",
    password: "Password123!",
  });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    displayName: "",
    bio: "",
  });
  const [profileForm, setProfileForm] = useState({
    userId: "1",
    displayName: "Hacker Mode",
    bio: "Tớ muốn hack role 😈",
    role: "admin",
  });

  const [loginResponse, setLoginResponse] = useState(null);
  const [registerResponse, setRegisterResponse] = useState(null);
  const [demoResponse, setDemoResponse] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const apiInfo = useMemo(
    () => ({
      unsafe: `${API_BASE}/api/profile/v1`,
      safe: `${API_BASE}/api/profile/v2`,
    }),
    []
  );

  const fetchUsers = async () => {
    setUsersLoading(true);
    setGlobalError("");
    try {
      const data = await request("/api/users", { method: "GET" });
      setUsers(data);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "demo") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setGlobalError("");
    try {
      const data = await request("/api/auth/login", { body: loginForm });
      setLoginResponse({ ok: true, data });
    } catch (err) {
      setLoginResponse({ ok: false, message: err.message, details: err.details });
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setGlobalError("");
    try {
      const data = await request("/api/auth/register", { body: registerForm });
      setRegisterResponse({ ok: true, data });
      setRegisterForm({ email: "", password: "", displayName: "", bio: "" });
      fetchUsers();
    } catch (err) {
      setRegisterResponse({ ok: false, message: err.message, details: err.details });
    }
  };

  const buildProfilePayload = () => {
    const payload = {
      userId: Number(profileForm.userId),
    };

    if (profileForm.displayName) payload.displayName = profileForm.displayName;
    if (profileForm.bio) payload.bio = profileForm.bio;
    if (profileForm.role) payload.role = profileForm.role;

    return payload;
  };

  const handleProfileUpdate = async (version) => {
    setGlobalError("");
    try {
      const data = await request(`/api/profile/${version}`, {
        body: buildProfilePayload(),
      });
      setDemoResponse({ ok: true, version, data });
      fetchUsers();
    } catch (err) {
      setDemoResponse({
        ok: false,
        version,
        message: err.message,
        details: err.details,
      });
    }
  };

  const handleReset = async () => {
    setGlobalError("");
    try {
      await request("/api/reset", { body: {} });
      setDemoResponse({ ok: true, data: { message: "Đã reset dữ liệu" } });
      fetchUsers();
    } catch (err) {
      setGlobalError(err.message);
    }
  };

  const renderSummaryCard = (title, content) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-500">{title}</p>
      <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-emerald-100 shadow-inner">
        {pretty(content)}
      </pre>
    </div>
  );

  const ResponseBlock = ({ header, payload }) =>
    renderSummaryCard(header, payload);

  return (
    <div className="bg-gradient-to-b from-slate-100 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-brand-600">Mass Assignment Demo</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Trang Đăng ký / Đăng nhập + Admin giả lập
          </h1>
          <p className="text-base text-slate-600">
            Frontend này dùng React + Vite + Tailwind để mô phỏng dòng chảy auth cơ bản,
            đồng thời minh họa rõ sự khác biệt giữa API profile <span className="font-semibold text-rose-600">/v1 (unsafe)</span>{" "}
            và <span className="font-semibold text-emerald-600">/v2 (safe)</span>.
          </p>
          <div className="text-sm text-slate-500">
            Backend/API hiện tại: <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">{API_BASE}</code>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
                activeTab === tab.id
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {globalError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            ⚠️ {globalError}
          </div>
        )}

        {activeTab === "login" && (
          <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
            <div>
              <h2 className={sectionTitle}>Đăng nhập nhanh</h2>
              <p className={helperText}>
                Sử dụng user seed mặc định hoặc tài khoản tự tạo để nhận payload phản hồi từ API.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    className={inputClass}
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-500"
                >
                  Gửi request /api/auth/login
                </button>
              </form>
            </div>
            <ResponseBlock
              header="Phản hồi mới nhất"
              payload={
                loginResponse?.ok
                  ? loginResponse.data
                  : loginResponse
                  ? { error: loginResponse.message, details: loginResponse.details }
                  : null
              }
            />
          </section>
        )}

        {activeTab === "register" && (
          <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
            <div>
              <h2 className={sectionTitle}>Đăng ký tài khoản mới</h2>
              <p className={helperText}>
                Tất cả user mới đều có role = <code className="font-mono">user</code>. Sau khi tạo xong có thể dùng tab Demo để thử nâng quyền.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Display name</label>
                  <input
                    className={inputClass}
                    name="displayName"
                    value={registerForm.displayName}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    className={inputClass}
                    type="password"
                    name="password"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Bio</label>
                  <textarea
                    className={`${inputClass} min-h-[100px]`}
                    name="bio"
                    value={registerForm.bio}
                    onChange={(e) =>
                      setRegisterForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-brand-500 bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
                >
                  Gửi request /api/auth/register
                </button>
              </form>
            </div>
            <ResponseBlock
              header="Phản hồi đăng ký"
              payload={
                registerResponse?.ok
                  ? registerResponse.data
                  : registerResponse
                  ? { error: registerResponse.message, details: registerResponse.details }
                  : null
              }
            />
          </section>
        )}

        {activeTab === "demo" && (
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className={sectionTitle}>Mass Assignment Playground</h2>
                <p className={helperText}>
                  Cố tình đính kèm field <code className="font-mono">role</code> khi gọi{" "}
                  <span className="font-semibold text-rose-600">/api/profile/v1</span> để thấy user bị nâng quyền.
                  Thử lại với <span className="font-semibold text-emerald-600">/v2</span> để xem bản fix.
                </p>
                <div className="mt-4 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">userId</label>
                    <input
                      className={inputClass}
                      name="userId"
                      value={profileForm.userId}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, userId: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">displayName</label>
                    <input
                      className={inputClass}
                      name="displayName"
                      value={profileForm.displayName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          displayName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">bio</label>
                    <textarea
                      className={`${inputClass} min-h-[80px]`}
                      name="bio"
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                      }
                    />
                  </div>
      <div>
                    <label className="text-sm font-medium text-slate-700">
                      role (thử đặt = admin để exploit)
                    </label>
                    <input
                      className={inputClass}
                      name="role"
                      value={profileForm.role}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, role: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleProfileUpdate("v1")}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300"
                    >
                      🚨 Gửi tới /api/profile/v1 (unsafe)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProfileUpdate("v2")}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300"
                    >
                      ✅ Gửi tới /api/profile/v2 (safe)
                    </button>
      </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-brand-600"
                  >
                    Reset database về trạng thái ban đầu
        </button>
                </div>
              </div>
              <ResponseBlock
                header="Kết quả gọi API"
                payload={
                  demoResponse?.ok
                    ? { version: demoResponse.version, ...demoResponse.data }
                    : demoResponse
                    ? {
                        version: demoResponse.version,
                        error: demoResponse.message,
                        details: demoResponse.details,
                      }
                    : null
                }
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Danh sách user</p>
                  <p className="text-xs text-slate-500">
                    Gọi trực tiếp <code className="font-mono">GET /api/users</code> để quan sát role thay đổi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="rounded-full border border-brand-500 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                  >
                    Làm mới
                  </button>
                  <span className="text-xs text-slate-500">
                    Unsafe: {apiInfo.unsafe} • Safe: {apiInfo.safe}
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-auto rounded-xl bg-slate-900/90 p-4 text-xs text-lime-100 shadow-inner">
                {usersLoading ? (
                  <p>Đang tải...</p>
                ) : users.length ? (
                  <pre>{pretty(users)}</pre>
                ) : (
                  <p>Chưa có user nào.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
