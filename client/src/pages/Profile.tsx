import { API_BASE } from "../config/api";
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  UserRound,
  LogOut,
  Bell,
  Camera,
  Upload,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "./Dashboard/StudentDashboard.css";
import "./Profile.css";
import logo from "../assets/images/LCClogo1.png";
import Toast from "../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../components/Toast/Toast";

const API_URL = API_BASE;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ProfileData = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  course: string | null;
  role: string;
  status: string;
  profile_picture: string | null;
  created_at?: string;
};

const EMPTY_PROFILE: ProfileData = {
  id: 0,
  username: "",
  email: "",
  full_name: "",
  course: null,
  role: "student",
  status: "Active",
  profile_picture: null,
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [form, setForm] = useState({
    username: "",
    email: "",
  });
  const [picture, setPicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const token = localStorage.getItem("token");

  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };

  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const applyProfile = (data: ProfileData) => {
    setProfile(data);
    setForm({
      username: data.username || "",
      email: data.email || "",
    });
    setPicture(data.profile_picture || null);

    localStorage.setItem("full_name", data.full_name || data.username);
    localStorage.setItem("username", data.username);
    localStorage.setItem("course", data.course || "");
    if (data.profile_picture) {
      localStorage.setItem("profile_picture", data.profile_picture);
    } else {
      localStorage.removeItem("profile_picture");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("username");
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load your profile.");
        }
        applyProfile(data as ProfileData);
      } catch (err: any) {
        setError(err.message || "Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const handleInputChange = (
    field: keyof typeof form,
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setSaved(false);
    setError("");
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handlePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("warning", "Invalid file", "Choose an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showToast("warning", "Image too large", "Choose an image under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPicture(String(reader.result || ""));
      setSaved(false);
      setError("");
    };
    reader.onerror = () => {
      showToast("error", "Upload failed", "Could not read that image.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePicture = () => {
    setPicture(null);
    setSaved(false);
    setError("");
  };

  const handleReset = () => {
    setForm({
      username: profile.username || "",
      email: profile.email || "",
    });
    setPicture(profile.profile_picture || null);
    setSaved(false);
    setError("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${API_URL}/api/student/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Name and course are registrar-managed, so they are never submitted.
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          profile_picture: picture,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to save your profile.");
      }

      applyProfile(data.user as ProfileData);
      setSaved(true);
      showToast("success", "Profile saved", data.message);
    } catch (err: any) {
      setError(err.message || "Unable to save your profile.");
      showToast("error", "Save failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("full_name");
    localStorage.removeItem("course");
    localStorage.removeItem("profile_picture");
    navigate("/login");
  };

  const statusClass = `profile-status ${
    String(profile.status).toLowerCase() === "active"
      ? "active"
      : String(profile.status).toLowerCase() === "pending"
        ? "pending"
        : "neutral"
  }`;

  return (
    <div className="student-dashboard-container profile-container">
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="student-sidebar">
        <div className="student-sidebar-header">
          <img src={logo} alt="LCC Logo" className="student-sidebar-logo" />
          <div>
            <div className="student-sidebar-title">LCC Student</div>
            <div className="student-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="student-sidebar-nav">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <ShoppingBag size={20} /> <span>Shop Merchandise</span>
          </NavLink>
          <NavLink
            to="/track-orders"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <Package size={20} /> <span>Track Orders</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <UserRound size={20} /> <span>My Profile</span>
          </NavLink>
        </nav>
        <div className="student-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="student-main-content">
        <div className="student-header">
          <h1 className="student-header-title">My Profile</h1>
          <div className="student-header-right">
            <Bell size={20} color="#6b7280" />
            <NavLink to="/profile" className="profile-avatar-link" aria-label="My profile">
              {picture ? (
                <img src={picture} alt="Profile" className="profile-header-avatar" />
              ) : (
                <div className="student-avatar">
                  {getInitials(profile.full_name || "Student").charAt(0)}
                </div>
              )}
            </NavLink>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={20} color="#dc2626" />
            </button>
          </div>
        </div>

        <div className="student-dashboard-content profile-content">
          {loading ? (
            <div className="profile-state">Loading profile...</div>
          ) : (
            <>
              <section className="profile-hero-card">
                <div className="profile-avatar-wrap">
                  {picture ? (
                    <img src={picture} alt="Profile preview" />
                  ) : (
                    <span>{getInitials(profile.full_name || "Student")}</span>
                  )}
                  <label className="profile-avatar-edit" title="Change photo">
                    <Camera size={16} />
                    <input
                      id="profile-picture-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handlePictureChange}
                    />
                  </label>
                </div>
                <div className="profile-hero-copy">
                  <h2>{profile.full_name || "Student"}</h2>
                  <p>Keep your account details up to date.</p>
                  <div className="profile-hero-meta">
                    <span className={statusClass}>{profile.status}</span>
                    <span>@{profile.username}</span>
                  </div>
                </div>
              </section>

              {error && (
                <div className="profile-message error" role="alert">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {saved && (
                <div className="profile-message success" role="status">
                  <CheckCircle2 size={16} /> Your changes have been saved.
                </div>
              )}

              <div className="profile-grid">
                <form className="profile-form-card" onSubmit={handleSave}>
                  <div className="profile-card-head">
                    <h3>Edit profile</h3>
                    <p>
                      Update your contact details. Your name and course are
                      managed by the registrar.
                    </p>
                  </div>

                  <div className="profile-form-grid">
                    <label className="profile-field field-wide">
                      <span>Full name</span>
                      <input
                        type="text"
                        value={profile.full_name}
                        readOnly
                        aria-readonly="true"
                      />
                      <small>
                        Your full name cannot be changed here. Contact the
                        registrar if it needs correcting.
                      </small>
                    </label>

                    <label className="profile-field">
                      <span>Username</span>
                      <input
                        type="text"
                        value={form.username}
                        maxLength={50}
                        autoComplete="username"
                        onChange={(event) =>
                          handleInputChange("username", event)
                        }
                        required
                      />
                    </label>

                    <label className="profile-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={form.email}
                        maxLength={150}
                        autoComplete="email"
                        onChange={(event) => handleInputChange("email", event)}
                        required
                      />
                    </label>

                    <label className="profile-field field-wide">
                      <span>Course</span>
                      <input
                        type="text"
                        value={profile.course || "Not set"}
                        readOnly
                        aria-readonly="true"
                      />
                      <small>
                        Your course cannot be changed here. It controls the
                        “My Course” filter in the shop.
                      </small>
                    </label>
                  </div>

                  <div className="profile-form-actions">
                    <button
                      type="button"
                      className="profile-secondary-btn"
                      onClick={handleReset}
                      disabled={saving}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="profile-save-btn"
                      disabled={saving}
                    >
                      <Save size={16} /> {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>

                <aside className="profile-side-card">
                  <div className="profile-card-head">
                    <h3>Account details</h3>
                    <p>Read-only information.</p>
                  </div>

                  <dl className="profile-details">
                    <div>
                      <dt>Role</dt>
                      <dd>{profile.role}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{profile.status}</dd>
                    </div>
                    <div>
                      <dt>Course</dt>
                      <dd>{profile.course || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Member since</dt>
                      <dd>{formatDate(profile.created_at)}</dd>
                    </div>
                  </dl>

                  <div className="profile-picture-tools">
                    <h4>Profile picture</h4>
                    <label className="profile-upload-btn" htmlFor="profile-picture-input">
                      <Upload size={16} /> Choose image
                    </label>
                    <button
                      type="button"
                      className="profile-remove-btn"
                      onClick={handleRemovePicture}
                      disabled={!picture}
                    >
                      <Trash2 size={16} /> Remove photo
                    </button>
                    <p>PNG, JPG, WEBP or GIF up to 5 MB.</p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
