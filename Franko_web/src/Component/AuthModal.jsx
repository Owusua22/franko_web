import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  createCustomer,
  loginCustomer,
  logoutCustomer,
  setCurrentCustomer,
  updateCustomerPassword,
  getCustomerById,
} from "../Redux/Slice/customerSlice";
import { v4 as uuidv4 } from "uuid";
import logo from "../assets/frankoIcon-128.webp";
import {
  XMarkIcon,
  UserIcon,
  LockClosedIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { User, UserPlus } from "lucide-react";

// ─── Auth modes: STRICTLY sign in + register ─────────────
const MODES = ["login", "signup"];

const resolveInitialMode = (initialMode) =>
  MODES.includes(initialMode) ? initialMode : "login";

// ─── Password rules ──────────────────────────
const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const getStrength = (password) => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: passed, label: "Very weak", color: "#ef4444" };
  if (passed === 2) return { score: passed, label: "Weak", color: "#f97316" };
  if (passed === 3) return { score: passed, label: "Fair", color: "#eab308" };
  if (passed === 4) return { score: passed, label: "Strong", color: "#22c55e" };
  return { score: passed, label: "Very strong", color: "#15803d" };
};

const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));

// Names that must never be registered (they break order validation downstream)
const isReservedName = (v) => /^\s*(guest|n\/?a|test|customer)\s*$/i.test(String(v || ""));

// ─── Toast ───────────────────────────────────
const Notification = ({ message, type, isVisible, onClose }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isVisible && message) timerRef.current = setTimeout(onClose, 4500);
    return () => clearTimeout(timerRef.current);
  }, [isVisible, message, onClose]);

  if (!isVisible || !message) return null;

  return (
    <div className="am-toast-wrap">
      <div className={`am-toast ${type === "success" ? "am-toast--ok" : "am-toast--err"}`}>
        <div className="am-toast__icon">
          {type === "success" ? (
            <CheckCircleIcon className="am-toast__svg" />
          ) : (
            <ExclamationTriangleIcon className="am-toast__svg" />
          )}
        </div>
        <span className="am-toast__msg">{message}</span>
        <button onClick={onClose} className="am-toast__close" aria-label="Close">
          <XMarkIcon />
        </button>
      </div>
    </div>
  );
};

// ─── Field ───────────────────────────────────
const Field = ({
  icon: Icon,
  label,
  type = "text",
  placeholder,
  name,
  value,
  onChange,
  isPassword,
  onKeyDown,
  autoComplete,
  inputMode,
  maxLength,
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;

  return (
    <div className={`am-field ${focused ? "am-field--focused" : ""} ${hasValue ? "am-field--filled" : ""}`}>
      <label className="am-field__label">{label || placeholder}</label>
      <div className="am-field__inner">
        <span className="am-field__icon"><Icon /></span>
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="am-field__input"
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete || (isPassword ? "current-password" : "off")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="am-field__toggle"
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Strength Meter ──────────────────────────
const StrengthMeter = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = getStrength(password);

  return (
    <div className="am-strength">
      <div className="am-strength__header">
        <div className="am-strength__bars">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="am-strength__bar"
              style={{ background: i < score ? color : "#e5e7eb" }}
            />
          ))}
        </div>
        <span className="am-strength__label" style={{ color }}>{label}</span>
      </div>

      <div className="am-strength__rules">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <span key={rule.id} className={`am-strength__rule ${ok ? "am-strength__rule--ok" : ""}`}>
              <span
                className="am-strength__check"
                style={{
                  borderColor: ok ? color : "#d1d5db",
                  background: ok ? color : "transparent",
                }}
              >
                {ok && (
                  <svg viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {rule.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Success Redirect Banner ─────────────────
const SuccessRedirectBanner = ({ title, message, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="am-banner am-banner--success">
      <CheckCircleIcon className="am-banner__icon" />
      <div className="am-banner__text">
        <p className="am-banner__title">{title}</p>
        <p className="am-banner__sub">{message}</p>
      </div>
      <ArrowPathIcon className="am-spin am-banner__spin" />
    </div>
  );
};

// ─── Force Change Password Modal ─────────────
const ForceChangePasswordModal = ({ customer, onSuccess }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handle = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async () => {
    setError("");

    if (!form.oldPassword) return setError("Please enter your current password.");
    if (!isStrongPassword(form.newPassword)) {
      return setError("New password does not meet strength requirements.");
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (form.oldPassword === form.newPassword) {
      return setError("New password must differ from current password.");
    }

    setLoading(true);

    try {
      await dispatch(
        updateCustomerPassword({
          contactNumber: customer.contactNumber,
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        })
      ).unwrap();

      const updatedProfile = await dispatch(
        getCustomerById({
          contactNumber: customer.contactNumber,
          accessToken: customer.accessToken,
        })
      ).unwrap();

      const completeCustomer = {
        ...updatedProfile,
        accessToken: customer.accessToken,
        refreshToken: customer.refreshToken,
        contactNumber: customer.contactNumber,
        loginStatus: true,
        isAuthenticated: true,
      };

      dispatch(setCurrentCustomer(completeCustomer));

      setDone(true);
      setTimeout(() => onSuccess(completeCustomer), 1500);
    } catch (err) {
      setError(
        typeof err === "object"
          ? err?.message || "Password update failed."
          : err || "Password update failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="am-force-overlay">
      <div className="am-force-backdrop" />
      <div className="am-force-card">
        <div className="am-force-strip" />
        <div className="am-force-header">
          <div className="am-force-shield">
            <ShieldCheckIcon />
          </div>
          <h3 className="am-force-title">Password Reset Required</h3>
          <p className="am-force-desc">
            Your account requires a password update before you can continue.
          </p>
        </div>

        {done ? (
          <div className="am-force-done">
            <CheckCircleIcon className="am-force-done__icon" />
            <p>Password updated successfully!</p>
          </div>
        ) : (
          <div className="am-force-body">
            {error && <div className="am-force-error">{error}</div>}

            <Field
              icon={LockClosedIcon}
              label="Current Password"
              placeholder="Enter current password"
              name="oldPassword"
              value={form.oldPassword}
              onChange={handle}
              isPassword
              autoComplete="current-password"
            />

            <Field
              icon={LockClosedIcon}
              label="New Password"
              placeholder="Enter new password"
              name="newPassword"
              value={form.newPassword}
              onChange={handle}
              isPassword
              autoComplete="new-password"
            />

            <StrengthMeter password={form.newPassword} />

            <Field
              icon={LockClosedIcon}
              label="Confirm Password"
              placeholder="Confirm new password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handle}
              isPassword
              autoComplete="new-password"
            />

            <button className="am-btn am-btn--primary" onClick={submit} disabled={loading}>
              {loading ? (
                <>
                  <ArrowPathIcon className="am-spin" /> Updating…
                </>
              ) : (
                <>
                  Update Password <ArrowRightIcon />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Change Password Panel ───────────────────
const ChangePasswordPanel = ({ customer, showNotification, onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async () => {
    if (!form.oldPassword) return showNotification("Enter your current password.", "error");
    if (!isStrongPassword(form.newPassword)) return showNotification("New password doesn't meet requirements.", "error");
    if (form.newPassword !== form.confirmPassword) return showNotification("Passwords do not match.", "error");
    if (form.oldPassword === form.newPassword) return showNotification("New password must differ from current.", "error");

    setLoading(true);

    try {
      await dispatch(
        updateCustomerPassword({
          contactNumber: customer?.contactNumber,
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        })
      ).unwrap();

      showNotification("Password changed successfully!", "success");
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(onClose, 1200);
    } catch (err) {
      showNotification(
        typeof err === "object"
          ? err?.message || "Failed to change password."
          : err || "Failed to change password.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="am-cp">
      <div className="am-cp__header">
        <div className="am-cp__icon-wrap">
          <ShieldCheckIcon />
        </div>
        <div>
          <p className="am-cp__title">Change Password</p>
          <p className="am-cp__sub">Update your account password</p>
        </div>
      </div>

      <div className="am-form-fields">
        <Field
          icon={LockClosedIcon}
          label="Current Password"
          placeholder="Current password"
          name="oldPassword"
          value={form.oldPassword}
          onChange={handle}
          isPassword
          autoComplete="current-password"
        />
        <Field
          icon={LockClosedIcon}
          label="New Password"
          placeholder="New password"
          name="newPassword"
          value={form.newPassword}
          onChange={handle}
          isPassword
          autoComplete="new-password"
        />
        <StrengthMeter password={form.newPassword} />
        <Field
          icon={LockClosedIcon}
          label="Confirm Password"
          placeholder="Confirm new password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handle}
          isPassword
          autoComplete="new-password"
        />
        <button className="am-btn am-btn--primary" onClick={submit} disabled={loading}>
          {loading ? (
            <>
              <ArrowPathIcon className="am-spin" /> Updating…
            </>
          ) : (
            <>
              Update Password <ArrowRightIcon />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Main AuthModal (Sign In + Register ONLY) ─
const AuthModal = ({
  open,
  onClose,
  onSuccess,
  currentCustomer,
  initialMode = "login",
  // eslint-disable-next-line no-unused-vars
  allowGuest, // DEPRECATED — guest checkout has been removed. Accepted for backwards compatibility only.
  autoLoginAfterSignup = false,
  notice = "",
}) => {
  const dispatch = useDispatch();

  const [authMode, setAuthMode] = useState(() => resolveInitialMode(initialMode));
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState({
    show: false,
    title: "",
    message: "",
  });
  const [notification, setNotification] = useState({
    message: "",
    type: "success",
    isVisible: false,
  });

  const [signupData, setSignupData] = useState({
    customerAccountNumber: "",
    firstName: "",
    lastName: "",
    contactNumber: "",
    address: "",
    password: "",
    accountType: "customer",
    email: "",
    accountStatus: "1",
  });

  const [loginData, setLoginData] = useState({
    contactNumber: "",
    password: "",
  });

  const hideNotif = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showNotif = useCallback((message, type = "success") => {
    setNotification({ message: "", type, isVisible: false });
    requestAnimationFrame(() => {
      setNotification({ message, type, isVisible: true });
    });
  }, []);

  const normalizePhone = (value = "") => value.replace(/\D/g, "");

  // Fresh account number whenever the register tab opens
  useEffect(() => {
    if (open && authMode === "signup") {
      setSignupData((prev) => ({
        ...prev,
        customerAccountNumber: prev.customerAccountNumber || uuidv4(),
      }));
    }
  }, [open, authMode]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset everything on close
  useEffect(() => {
    if (!open) {
      hideNotif();
      setAuthMode(resolveInitialMode(initialMode));
      setShowChangePassword(false);
      setLoading(false);
      setForcePasswordChange(false);
      setPendingCustomer(null);
      setRedirecting(false);
      setSuccessRedirect({ show: false, title: "", message: "" });

      setSignupData({
        customerAccountNumber: "",
        firstName: "",
        lastName: "",
        contactNumber: "",
        address: "",
        password: "",
        accountType: "customer",
        email: "",
        accountStatus: "1",
      });

      setLoginData({
        contactNumber: "",
        password: "",
      });
    }
  }, [open, hideNotif, initialMode]);

  useEffect(() => {
    if (!open) return;
    setAuthMode(resolveInitialMode(initialMode));
  }, [open, initialMode]);

  // Safety net: any legacy value (e.g. "guest") falls back to sign in
  useEffect(() => {
    if (!MODES.includes(authMode)) setAuthMode("login");
  }, [authMode]);

  useEffect(() => {
    hideNotif();
    setShowChangePassword(false);
    setRedirecting(false);
    setSuccessRedirect({ show: false, title: "", message: "" });
  }, [authMode, hideNotif]);

  /* ── Validation ───────────────────────────── */
  const validateSignup = () => {
    const { firstName, lastName, contactNumber, password } = signupData;
    const phone = normalizePhone(contactNumber);

    if (!firstName.trim()) {
      showNotif("First name is required.", "error");
      return false;
    }

    if (isReservedName(firstName) || isReservedName(lastName)) {
      showNotif("Please enter your real name — placeholder names are not accepted.", "error");
      return false;
    }

    if (!lastName.trim()) {
      showNotif("Last name is required.", "error");
      return false;
    }

    if (!phone) {
      showNotif("Contact number is required.", "error");
      return false;
    }

    if (phone.length !== 10) {
      showNotif("Contact number must be 10 digits.", "error");
      return false;
    }

    if (!isStrongPassword(password)) {
      showNotif("Password doesn't meet requirements.", "error");
      return false;
    }

    return true;
  };

  const validateLogin = () => {
    const phone = normalizePhone(loginData.contactNumber);

    if (!phone) {
      showNotif("Contact number is required.", "error");
      return false;
    }

    if (phone.length !== 10) {
      showNotif("Contact number must be 10 digits.", "error");
      return false;
    }

    if (!loginData.password) {
      showNotif("Password is required.", "error");
      return false;
    }

    return true;
  };

  /* ── Register ─────────────────────────────── */
  const handleSignup = async () => {
    if (!validateSignup()) return;

    setLoading(true);

    try {
      dispatch(logoutCustomer());

      const payload = {
        ...signupData,
        customerAccountNumber: signupData.customerAccountNumber || uuidv4(),
        firstName: signupData.firstName.trim(),
        lastName: signupData.lastName.trim(),
        address: signupData.address.trim(),
        email: signupData.email.trim(),
        contactNumber: normalizePhone(signupData.contactNumber),
      };

      const result = await dispatch(createCustomer(payload)).unwrap();

      if (result?.ResponseCode === "2") {
        showNotif((result.ResponseMessage || "Account already exists.") + " Please sign in.", "error");

        setTimeout(() => {
          setLoginData((prev) => ({
            ...prev,
            contactNumber: payload.contactNumber,
          }));
          setAuthMode("login");
        }, 1800);

        return;
      }

      if (result?.ResponseCode && result.ResponseCode !== "1") {
        showNotif(result.ResponseMessage || "Registration failed.", "error");
        return;
      }

      if (autoLoginAfterSignup) {
        try {
          const loginResult = await dispatch(
            loginCustomer({
              contactNumber: payload.contactNumber,
              password: payload.password,
            })
          ).unwrap();

          if (loginResult?.requiresPasswordChange || loginResult?.loginStatus === false) {
            setPendingCustomer(loginResult);
            setForcePasswordChange(true);
            return;
          }

          if (!loginResult?.accessToken || !loginResult?.contactNumber) {
            throw new Error("Login succeeded but customer session is incomplete.");
          }

          dispatch(setCurrentCustomer(loginResult));
          showNotif("Account created. Continuing…", "success");
          setTimeout(() => {
            if (onSuccess) onSuccess(loginResult);
            else onClose();
          }, 700);
          return;
        } catch {
          setLoginData({
            contactNumber: payload.contactNumber,
            password: payload.password,
          });
          setAuthMode("login");
          showNotif("Account created. Please sign in to continue.", "success");
          return;
        }
      }

      setSuccessRedirect({
        show: true,
        title: "Account created!",
        message: "Redirecting to sign in…",
      });

      setLoginData({
        contactNumber: payload.contactNumber,
        password: payload.password,
      });

      setTimeout(() => {
        setSuccessRedirect({ show: false, title: "", message: "" });
        setAuthMode("login");
        showNotif("Registration complete. Please sign in.", "success");
      }, 2200);
    } catch (err) {
      showNotif(
        typeof err === "object"
          ? err?.message || "Registration failed."
          : err || "Registration failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Sign in ──────────────────────────────── */
  const handleLogin = async () => {
    if (!validateLogin()) return;

    setLoading(true);

    try {
      const result = await dispatch(
        loginCustomer({
          contactNumber: normalizePhone(loginData.contactNumber),
          password: loginData.password,
        })
      ).unwrap();

      if (result?.requiresPasswordChange || result?.loginStatus === false) {
        setPendingCustomer(result);
        setForcePasswordChange(true);
        return;
      }

      if (!result?.accessToken || !result?.contactNumber) {
        showNotif("Login succeeded but customer session is incomplete.", "error");
        return;
      }

      dispatch(setCurrentCustomer(result));

      showNotif("Welcome back!", "success");

      setTimeout(() => {
        if (onSuccess) onSuccess(result);
        else onClose();
      }, 1000);
    } catch (err) {
      const message =
        typeof err === "object"
          ? err?.message || "Login failed."
          : err || "Login failed.";

      const isAccountNotFound =
        typeof err === "object" && err?.isAccountNotFound === true;

      if (isAccountNotFound) {
        setRedirecting(true);

        showNotif("No account found. Redirecting to register…", "error");

        setSignupData((prev) => ({
          ...prev,
          contactNumber: loginData.contactNumber,
          customerAccountNumber: uuidv4(),
        }));

        setTimeout(() => {
          setRedirecting(false);
          setAuthMode("signup");
        }, 1800);

        return;
      }

      showNotif(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key !== "Enter" || loading) return;
    if (authMode === "login") handleLogin();
    else if (authMode === "signup") handleSignup();
  };

  if (!open) return null;

  const tabs = [
    { key: "login", label: "Sign In", Icon: User },
    { key: "signup", label: "Register", Icon: UserPlus },
  ];

  const headings = {
    login: { title: "Welcome back", sub: "Sign in to continue shopping" },
    signup: {
      title: "Create your account",
      sub: notice ? "Register before placing your order" : "Join Franko Trading today",
    },
  };

  const activeIndex = authMode === "signup" ? 1 : 0;

  return (
    <>
      <style>{STYLES}</style>
      <Notification {...notification} onClose={hideNotif} />

      {forcePasswordChange && pendingCustomer && (
        <ForceChangePasswordModal
          customer={pendingCustomer}
          onSuccess={(updatedCustomer) => {
            setForcePasswordChange(false);
            setPendingCustomer(null);
            showNotif("Password updated! You're now signed in.", "success");

            setTimeout(() => {
              if (onSuccess) onSuccess(updatedCustomer || pendingCustomer);
              else onClose();
            }, 1200);
          }}
        />
      )}

      <div className="am-overlay" onClick={onClose}>
        <div className="am-backdrop" />
        <div
          className="am-modal"
          role="dialog"
          aria-modal="true"
          aria-label={headings[authMode].title}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKey}
        >
          <div className="am-drag-handle"><span /></div>

          <button className="am-close" onClick={onClose} aria-label="Close">
            <XMarkIcon />
          </button>

          <header className="am-header">
            <img src={logo} alt="Franko" className="am-logo" />
            <h2 className="am-heading">{headings[authMode].title}</h2>
            <p className="am-subheading">{headings[authMode].sub}</p>
          </header>

          {notice ? <div className="am-notice">{notice}</div> : null}

          {/* ── Two-tab segmented control: Sign In / Register ── */}
          <nav className="am-tabs" role="tablist" aria-label="Authentication mode">
            <span
              className="am-tabs__indicator"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
              aria-hidden="true"
            />
            {tabs.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={authMode === key}
                onClick={() => setAuthMode(key)}
                className={`am-tab ${authMode === key ? "am-tab--active" : ""}`}
              >
                <Icon className="am-tab__icon" />
                <span className="am-tab__label">{label}</span>
              </button>
            ))}
          </nav>

          <div className="am-content">
            {showChangePassword ? (
              <div className="am-content__inner">
                <button className="am-back" onClick={() => setShowChangePassword(false)}>
                  ← Back to Sign In
                </button>

                <ChangePasswordPanel
                  customer={currentCustomer}
                  showNotification={showNotif}
                  onClose={() => {
                    setShowChangePassword(false);
                    onClose();
                  }}
                />
              </div>
            ) : (
              <div className="am-content__inner">
                <SuccessRedirectBanner
                  title={successRedirect.title}
                  message={successRedirect.message}
                  isVisible={successRedirect.show}
                />

                {redirecting && (
                  <div className="am-banner am-banner--warning">
                    <ExclamationTriangleIcon className="am-banner__icon" />
                    <div className="am-banner__text">
                      <p className="am-banner__title">Account not found</p>
                      <p className="am-banner__sub">Redirecting to register…</p>
                    </div>
                    <ArrowPathIcon className="am-spin am-banner__spin" />
                  </div>
                )}

                {/* ══════════ SIGN IN ══════════ */}
                {authMode === "login" && (
                  <div className="am-form-fields">
                    <Field
                      icon={PhoneIcon}
                      label="Phone Number"
                      placeholder="Enter 10-digit number"
                      name="contactNumber"
                      inputMode="numeric"
                      maxLength={15}
                      autoComplete="tel"
                      value={loginData.contactNumber}
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                    />

                    <Field
                      icon={LockClosedIcon}
                      label="Password"
                      placeholder="Enter your password"
                      name="password"
                      value={loginData.password}
                      autoComplete="current-password"
                      onChange={(e) =>
                        setLoginData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                      isPassword
                    />

                    <button
                      className="am-btn am-btn--primary"
                      onClick={handleLogin}
                      disabled={loading || redirecting}
                    >
                      {loading ? (
                        <>
                          <ArrowPathIcon className="am-spin" /> Signing in…
                        </>
                      ) : (
                        <>
                          Sign In <ArrowRightIcon />
                        </>
                      )}
                    </button>

                    <div className="am-footer-links">
                      <span>Don't have an account?</span>
                      <button className="am-link" onClick={() => setAuthMode("signup")}>
                        Register
                      </button>
                    </div>

                    {currentCustomer && (
                      <>
                        <div className="am-divider">
                          <span />
                          <span className="am-divider__text">Settings</span>
                          <span />
                        </div>

                        <button className="am-link-btn" onClick={() => setShowChangePassword(true)}>
                          <ShieldCheckIcon /> Change Password
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ══════════ REGISTER ══════════ */}
                {authMode === "signup" && (
                  <div className="am-form-fields">
                    <div className="am-field-row">
                      <Field
                        icon={UserIcon}
                        label="First Name"
                        placeholder="First name"
                        name="firstName"
                        autoComplete="given-name"
                        value={signupData.firstName}
                        onChange={(e) =>
                          setSignupData((prev) => ({
                            ...prev,
                            [e.target.name]: e.target.value,
                          }))
                        }
                      />

                      <Field
                        icon={UserIcon}
                        label="Last Name"
                        placeholder="Last name"
                        name="lastName"
                        autoComplete="family-name"
                        value={signupData.lastName}
                        onChange={(e) =>
                          setSignupData((prev) => ({
                            ...prev,
                            [e.target.name]: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Field
                      icon={PhoneIcon}
                      label="Phone Number"
                      placeholder="10-digit number"
                      name="contactNumber"
                      inputMode="numeric"
                      maxLength={15}
                      autoComplete="tel"
                      value={signupData.contactNumber}
                      onChange={(e) =>
                        setSignupData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                    />

                    <Field
                      icon={EnvelopeIcon}
                      type="email"
                      label="Email (optional)"
                      placeholder="your@email.com"
                      name="email"
                      autoComplete="email"
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                    />

                    <Field
                      icon={HomeIcon}
                      label="Address"
                      placeholder="Your address"
                      name="address"
                      autoComplete="street-address"
                      value={signupData.address}
                      onChange={(e) =>
                        setSignupData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                    />

                    <Field
                      icon={LockClosedIcon}
                      label="Password"
                      placeholder="Create a strong password"
                      name="password"
                      autoComplete="new-password"
                      value={signupData.password}
                      onChange={(e) =>
                        setSignupData((prev) => ({
                          ...prev,
                          [e.target.name]: e.target.value,
                        }))
                      }
                      isPassword
                    />

                    <StrengthMeter password={signupData.password} />

                    <button
                      className="am-btn am-btn--primary"
                      onClick={handleSignup}
                      disabled={loading || successRedirect.show}
                    >
                      {loading ? (
                        <>
                          <ArrowPathIcon className="am-spin" /> Creating…
                        </>
                      ) : (
                        <>
                          Create Account <ArrowRightIcon />
                        </>
                      )}
                    </button>

                    <div className="am-footer-links">
                      <span>Already have an account?</span>
                      <button className="am-link" onClick={() => setAuthMode("login")}>
                        Sign in
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const STYLES = `
  :root {
    --am-primary: #14532d;
    --am-primary-hover: #166534;
    --am-accent: #22c55e;
    --am-accent-light: #dcfce7;
    --am-danger: #dc2626;
    --am-warning: #f59e0b;
    --am-text: #111827;
    --am-text-secondary: #6b7280;
    --am-text-tertiary: #9ca3af;
    --am-bg: #ffffff;
    --am-bg-secondary: #f9fafb;
    --am-border: #e5e7eb;
    --am-border-focus: #22c55e;
    --am-radius: 12px;
    --am-radius-sm: 8px;
    --am-shadow-sm: 0 1px 2px rgba(0,0,0,.05);
    --am-shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);
    --am-shadow-lg: 0 20px 60px -12px rgba(0,0,0,.25);
    --am-font: 'Plus Jakarta Sans', sans-serif;
    --am-transition: 200ms cubic-bezier(.4,0,.2,1);
  }

  .am-overlay {
    position: fixed; inset: 0; z-index: 10050;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: amFadeIn .2s ease;
  }

  .am-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  @keyframes amFadeIn { from { opacity: 0 } to { opacity: 1 } }

  .am-modal {
    position: relative; z-index: 1;
    background: var(--am-bg);
    border-radius: var(--am-radius);
    width: 100%; max-width: 510px;
    box-shadow: var(--am-shadow-lg), 0 0 0 1px rgba(0,0,0,.05);
    font-family: var(--am-font);
    -webkit-font-smoothing: antialiased;
    max-height: 92vh;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    animation: amSlideUp .3s cubic-bezier(.16,1,.3,1);
  }

  .am-modal::-webkit-scrollbar { width: 3px; }
  .am-modal::-webkit-scrollbar-track { background: transparent; }
  .am-modal::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

  @keyframes amSlideUp {
    from { opacity: 0; transform: translateY(16px) scale(.98) }
    to { opacity: 1; transform: translateY(0) scale(1) }
  }

  .am-drag-handle {
    display: none;
    justify-content: center;
    padding: 10px 0 2px;
  }

  .am-drag-handle span {
    width: 36px; height: 4px;
    background: #d1d5db; border-radius: 99px;
  }

  .am-close {
    position: absolute; top: 16px; right: 16px; z-index: 10;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--am-border);
    border-radius: var(--am-radius-sm);
    background: var(--am-bg);
    cursor: pointer;
    transition: all var(--am-transition);
    color: var(--am-text-secondary);
  }

  .am-close svg { width: 16px; height: 16px; }
  .am-close:hover { background: var(--am-bg-secondary); color: var(--am-text); }
  .am-close:active { transform: scale(.95); }

  .am-header {
    padding: 28px 28px 0;
    text-align: center;
  }

  .am-logo {
    height: 36px; width: auto;
    margin-bottom: 16px;
    object-fit: contain;
  }

  .am-heading {
    font-size: 22px; font-weight: 800;
    color: var(--am-text);
    margin: 0 0 4px;
    letter-spacing: -.04em;
    line-height: 1.2;
  }

  .am-subheading {
    font-size: 14px; font-weight: 400;
    color: var(--am-text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .am-notice {
    margin: 16px 28px 0;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #14532d;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.45;
    font-family: var(--am-font);
  }

  /* ── Two-tab segmented control ── */
  .am-tabs {
    position: relative;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    margin: 20px 28px 0;
    background: var(--am-bg-secondary);
    border: 1px solid var(--am-border);
    border-radius: 10px;
    padding: 4px;
    gap: 2px;
    isolation: isolate;
  }

  .am-tabs__indicator {
    position: absolute;
    top: 4px; bottom: 4px; left: 4px;
    width: calc(50% - 4px);
    background: var(--am-bg);
    border-radius: 7px;
    box-shadow: 0 1px 3px rgba(0,0,0,.09), 0 1px 2px rgba(0,0,0,.06);
    transition: transform .26s cubic-bezier(.4,0,.2,1);
    z-index: -1;
  }

  .am-tab {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 11px 8px;
    font-size: 13px; font-weight: 700;
    color: var(--am-text-tertiary);
    border: none; background: transparent;
    cursor: pointer; border-radius: 7px;
    transition: color var(--am-transition);
    font-family: var(--am-font);
    white-space: nowrap;
  }

  .am-tab__icon { width: 15px; height: 15px; flex-shrink: 0; }
  .am-tab__label { font-size: 13px; }
  .am-tab:hover:not(.am-tab--active) { color: var(--am-text-secondary); }
  .am-tab--active { color: var(--am-primary); }

  .am-content { padding: 20px 28px 28px; }

  .am-content__inner {
    display: flex; flex-direction: column; gap: 0;
    animation: amContentIn .25s ease;
  }

  @keyframes amContentIn {
    from { opacity: 0; transform: translateY(6px) }
    to { opacity: 1; transform: translateY(0) }
  }

  .am-form-fields { display: flex; flex-direction: column; gap: 14px; }

  .am-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .am-field { display: flex; flex-direction: column; gap: 5px; }

  .am-field__label {
    font-size: 12.5px; font-weight: 600;
    color: var(--am-text-secondary);
    letter-spacing: -.01em;
    font-family: var(--am-font);
    padding-left: 2px;
  }

  .am-field--focused .am-field__label { color: var(--am-primary); }

  .am-field__inner {
    display: flex; align-items: center;
    border: 1.5px solid var(--am-border);
    border-radius: var(--am-radius-sm);
    height: 48px;
    overflow: hidden;
    transition: all var(--am-transition);
    background: var(--am-bg);
  }

  .am-field--focused .am-field__inner {
    border-color: var(--am-border-focus);
    box-shadow: 0 0 0 3px rgba(34,197,94,.1);
  }

  .am-field__icon {
    width: 44px; min-width: 44px;
    display: flex; align-items: center; justify-content: center;
    color: var(--am-text-tertiary);
    transition: color var(--am-transition);
  }

  .am-field__icon svg { width: 17px; height: 17px; }
  .am-field--focused .am-field__icon { color: var(--am-accent); }

  .am-field__input {
    flex: 1; border: none; outline: none;
    background: transparent;
    font-size: 14px; font-weight: 450;
    color: var(--am-text);
    height: 100%;
    padding-right: 12px;
    font-family: var(--am-font);
    min-width: 0;
  }

  .am-field__input::placeholder { color: var(--am-text-tertiary); font-weight: 400; }

  .am-field__toggle {
    width: 42px; min-width: 42px; height: 100%;
    display: flex; align-items: center; justify-content: center;
    border: none; background: none;
    cursor: pointer;
    color: var(--am-text-tertiary);
    transition: color var(--am-transition);
  }

  .am-field__toggle svg { width: 17px; height: 17px; }
  .am-field__toggle:hover { color: var(--am-text); }

  .am-strength { padding: 2px 0 4px; }

  .am-strength__header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 8px;
  }

  .am-strength__bars { display: flex; gap: 3px; flex: 1; }

  .am-strength__bar {
    flex: 1; height: 4px;
    border-radius: 99px;
    transition: background .3s ease;
  }

  .am-strength__label {
    font-size: 11px; font-weight: 700;
    font-family: var(--am-font);
    white-space: nowrap;
  }

  .am-strength__rules { display: flex; flex-wrap: wrap; gap: 6px 12px; }

  .am-strength__rule {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 450;
    color: var(--am-text-tertiary);
    font-family: var(--am-font);
    transition: color .2s;
  }

  .am-strength__rule--ok { color: var(--am-text); }

  .am-strength__check {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1.5px solid #d1d5db;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all .2s;
  }

  .am-strength__check svg { width: 9px; height: 9px; }

  .am-btn {
    width: 100%; height: 48px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border: none; border-radius: var(--am-radius-sm);
    font-size: 14px; font-weight: 700;
    cursor: pointer;
    transition: all var(--am-transition);
    font-family: var(--am-font);
    letter-spacing: -.01em;
    margin-top: 2px;
  }

  .am-btn svg { width: 17px; height: 17px; }

  .am-btn--primary {
    background: linear-gradient(135deg, var(--am-primary) 0%, #166534 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(20,83,45,.3), inset 0 1px 0 rgba(255,255,255,.1);
  }

  .am-btn--primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #166534 0%, #14532d 100%);
    box-shadow: 0 4px 14px rgba(20,83,45,.4);
    transform: translateY(-1px);
  }

  .am-btn--primary:active:not(:disabled) {
    transform: translateY(0) scale(.995);
    box-shadow: 0 1px 4px rgba(20,83,45,.25);
  }

  .am-btn--primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

  .am-footer-links {
    display: flex; align-items: center; justify-content: center;
    gap: 6px; flex-wrap: wrap;
    font-size: 13px; color: var(--am-text-secondary);
    font-family: var(--am-font);
    padding-top: 2px;
  }

  .am-link {
    color: var(--am-primary); font-weight: 700;
    border: none; background: none;
    cursor: pointer; font-size: 13px;
    font-family: var(--am-font);
    padding: 0;
    transition: all var(--am-transition);
  }

  .am-link:hover { color: var(--am-primary-hover); text-decoration: underline; }

  .am-link-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    color: var(--am-text-secondary);
    font-size: 13px; font-weight: 500;
    border: 1.5px dashed var(--am-border);
    background: transparent;
    cursor: pointer;
    font-family: var(--am-font);
    padding: 10px;
    border-radius: var(--am-radius-sm);
    transition: all var(--am-transition);
    width: 100%;
  }

  .am-link-btn svg { width: 15px; height: 15px; }

  .am-link-btn:hover {
    color: var(--am-primary);
    border-color: var(--am-accent);
    background: rgba(34,197,94,.04);
  }

  .am-divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }

  .am-divider > span:first-child,
  .am-divider > span:last-child { flex: 1; height: 1px; background: var(--am-border); }

  .am-divider__text {
    font-size: 10.5px; font-weight: 600;
    color: var(--am-text-tertiary);
    letter-spacing: .06em;
    text-transform: uppercase;
    font-family: var(--am-font);
    white-space: nowrap;
  }

  .am-back {
    display: inline-flex; align-items: center; gap: 4px;
    color: var(--am-text-secondary);
    font-size: 13px; font-weight: 500;
    border: none; background: none;
    cursor: pointer; font-family: var(--am-font);
    padding: 0; margin-bottom: 16px;
    transition: color var(--am-transition);
  }

  .am-back:hover { color: var(--am-primary); }

  .am-cp { display: flex; flex-direction: column; gap: 16px; }

  .am-cp__header {
    display: flex; align-items: center; gap: 14px;
    background: var(--am-accent-light);
    border: 1px solid #bbf7d0;
    border-radius: var(--am-radius-sm);
    padding: 14px 16px;
  }

  .am-cp__icon-wrap {
    width: 40px; height: 40px; min-width: 40px;
    border-radius: var(--am-radius-sm);
    background: #fff; border: 1px solid #bbf7d0;
    display: flex; align-items: center; justify-content: center;
  }

  .am-cp__icon-wrap svg { width: 20px; height: 20px; color: var(--am-primary); }
  .am-cp__title { font-size: 14px; font-weight: 700; color: var(--am-primary); margin: 0 0 2px; font-family: var(--am-font); }
  .am-cp__sub { font-size: 12.5px; color: #166534; margin: 0; font-family: var(--am-font); }

  .am-banner {
    display: flex; align-items: center; gap: 12px;
    border-radius: var(--am-radius-sm);
    padding: 14px 16px;
    margin-bottom: 8px;
    animation: amContentIn .3s ease;
  }

  .am-banner__icon { width: 22px; height: 22px; flex-shrink: 0; }
  .am-banner__text { flex: 1; min-width: 0; }
  .am-banner__title { font-size: 13px; font-weight: 700; margin: 0 0 2px; font-family: var(--am-font); }
  .am-banner__sub { font-size: 12px; margin: 0; font-family: var(--am-font); }
  .am-banner__spin { width: 18px; height: 18px; flex-shrink: 0; }

  .am-banner--success { background: var(--am-accent-light); border: 1px solid #bbf7d0; }
  .am-banner--success .am-banner__icon { color: var(--am-primary); }
  .am-banner--success .am-banner__title { color: var(--am-primary); }
  .am-banner--success .am-banner__sub { color: #166534; }
  .am-banner--success .am-banner__spin { color: var(--am-primary); }

  .am-banner--warning { background: #fffbeb; border: 1px solid #fde68a; }
  .am-banner--warning .am-banner__icon { color: #d97706; }
  .am-banner--warning .am-banner__title { color: #92400e; }
  .am-banner--warning .am-banner__sub { color: #b45309; }
  .am-banner--warning .am-banner__spin { color: #d97706; }

  .am-spin { width: 18px; height: 18px; animation: amSpin .7s linear infinite; }

  @keyframes amSpin { to { transform: rotate(360deg) } }

  .am-toast-wrap {
    position: fixed; top: 20px; left: 50%;
    transform: translateX(-50%);
    z-index: 10060;
    width: calc(100% - 32px);
    max-width: 420px;
    animation: amToastIn .35s cubic-bezier(.16,1,.3,1);
    pointer-events: none;
  }

  @keyframes amToastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-14px) scale(.96) }
    to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) }
  }

  .am-toast {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px;
    border-radius: var(--am-radius);
    box-shadow: 0 12px 40px rgba(0,0,0,.18);
    font-family: var(--am-font);
    pointer-events: all;
  }

  .am-toast--ok { background: linear-gradient(135deg, #14532d, #166534); color: #fff; }
  .am-toast--err { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; }
  .am-toast__icon { flex-shrink: 0; }
  .am-toast__svg { width: 20px; height: 20px; color: rgba(255,255,255,.9); }
  .am-toast__msg { flex: 1; font-size: 13px; font-weight: 500; line-height: 1.4; }

  .am-toast__close {
    flex-shrink: 0; width: 24px; height: 24px;
    border-radius: 6px;
    border: none; background: rgba(255,255,255,.15);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .15s;
  }

  .am-toast__close svg { width: 14px; height: 14px; }
  .am-toast__close:hover { background: rgba(255,255,255,.3); }

  .am-force-overlay {
    position: fixed; inset: 0; z-index: 10070;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: amFadeIn .2s ease;
  }

  .am-force-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,.6);
    backdrop-filter: blur(10px);
  }

  .am-force-card {
    position: relative; z-index: 1;
    background: #fff;
    border-radius: var(--am-radius);
    width: 100%; max-width: 420px;
    box-shadow: 0 40px 100px rgba(0,0,0,.3);
    font-family: var(--am-font);
    overflow: hidden;
    animation: amSlideUp .3s cubic-bezier(.16,1,.3,1);
    max-height: 92vh; overflow-y: auto;
  }

  .am-force-strip {
    height: 4px;
    background: linear-gradient(90deg, var(--am-primary), var(--am-accent), var(--am-primary));
    background-size: 200%;
    animation: amStrip 2.5s ease infinite alternate;
  }

  @keyframes amStrip { from { background-position: 0% } to { background-position: 100% } }

  .am-force-header { padding: 28px 28px 20px; text-align: center; }

  .am-force-shield {
    width: 56px; height: 56px; border-radius: 14px;
    background: linear-gradient(135deg, var(--am-accent-light), #f0fdf4);
    border: 2px solid #bbf7d0;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }

  .am-force-shield svg { width: 28px; height: 28px; color: var(--am-primary); }
  .am-force-title { font-size: 20px; font-weight: 800; color: var(--am-text); margin: 0 0 6px; letter-spacing: -.03em; }
  .am-force-desc { font-size: 13.5px; color: var(--am-text-secondary); margin: 0; line-height: 1.5; }

  .am-force-body { padding: 0 28px 28px; display: flex; flex-direction: column; gap: 14px; }

  .am-force-error {
    background: #fef2f2; border: 1px solid #fecaca;
    border-radius: var(--am-radius-sm);
    padding: 12px 16px;
    font-size: 13px; color: var(--am-danger);
    line-height: 1.4; font-family: var(--am-font);
  }

  .am-force-done {
    display: flex; flex-direction: column; align-items: center;
    padding: 36px 28px; gap: 14px; text-align: center;
  }

  .am-force-done__icon { width: 56px; height: 56px; color: var(--am-accent); }
  .am-force-done p { font-size: 16px; font-weight: 700; color: var(--am-text); margin: 0; font-family: var(--am-font); }

  @media (max-width: 640px) {
    .am-overlay { align-items: flex-end; padding: 0; }

    .am-modal {
      border-radius: 20px 20px 0 0;
      max-width: 100%;
      max-height: 96vh;
      animation: amMobileSlideUp .35s cubic-bezier(.16,1,.3,1);
    }

    @keyframes amMobileSlideUp {
      from { opacity: 0; transform: translateY(100%) }
      to { opacity: 1; transform: translateY(0) }
    }

    .am-drag-handle { display: flex; }

    .am-close {
      top: 12px; right: 12px;
      width: 36px; height: 36px;
      border-radius: 50%;
    }

    .am-header { padding: 8px 20px 0; }
    .am-logo { height: 32px; margin-bottom: 12px; }
    .am-heading { font-size: 20px; }
    .am-subheading { font-size: 13px; }
    .am-notice { margin: 12px 20px 0; }

    .am-tabs { margin: 16px 20px 0; border-radius: var(--am-radius-sm); padding: 4px; }
    .am-tab { padding: 11px 6px; gap: 6px; }
    .am-tab__icon { width: 15px; height: 15px; }
    .am-tab__label { font-size: 13px; }

    .am-content { padding: 16px 20px 32px; }
    .am-form-fields { gap: 12px; }

    .am-field-row { grid-template-columns: 1fr; gap: 12px; }

    .am-field__label { font-size: 12px; }
    .am-field__inner { height: 50px; }
    .am-field__icon { width: 46px; min-width: 46px; }
    .am-field__icon svg { width: 18px; height: 18px; }
    .am-field__input { font-size: 15px; }
    .am-field__toggle { width: 46px; min-width: 46px; }
    .am-field__toggle svg { width: 18px; height: 18px; }

    .am-btn { height: 52px; font-size: 15px; border-radius: var(--am-radius); }
    .am-btn svg { width: 18px; height: 18px; }

    .am-footer-links { font-size: 13.5px; padding-top: 4px; }
    .am-link { font-size: 13.5px; }
    .am-link-btn { padding: 12px; font-size: 13.5px; }

    .am-strength__rules { gap: 4px 10px; }
    .am-strength__rule { font-size: 10.5px; }

    .am-banner { padding: 12px 14px; }

    .am-toast-wrap { top: auto; bottom: 20px; width: calc(100% - 24px); }

    @keyframes amToastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(14px) scale(.96) }
      to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) }
    }

    .am-force-overlay { align-items: flex-end; padding: 0; }

    .am-force-card { border-radius: 20px 20px 0 0; max-width: 100%; max-height: 96vh; }

    .am-force-header { padding: 24px 20px 16px; }
    .am-force-title { font-size: 18px; }
    .am-force-desc { font-size: 13px; }
    .am-force-body { padding: 0 20px 32px; gap: 12px; }
  }

  @media (max-width: 380px) {
    .am-header { padding: 6px 16px 0; }
    .am-heading { font-size: 18px; }
    .am-subheading { font-size: 12.5px; }
    .am-notice { margin: 10px 16px 0; }

    .am-tabs { margin: 14px 16px 0; }
    .am-tab { padding: 10px 4px; }
    .am-tab__label { font-size: 12px; }

    .am-content { padding: 14px 16px 28px; }
    .am-form-fields { gap: 10px; }
    .am-field__inner { height: 48px; }
    .am-field__input { font-size: 14px; }
    .am-btn { height: 48px; font-size: 14px; }
  }

  @media (max-height: 600px) and (max-width: 640px) {
    .am-modal { max-height: 100vh; }
    .am-header { padding: 6px 20px 0; }
    .am-logo { height: 28px; margin-bottom: 8px; }
    .am-heading { font-size: 17px; }
    .am-subheading { font-size: 12px; }
    .am-tabs { margin: 10px 20px 0; }
    .am-tab { padding: 9px 6px; }
    .am-content { padding: 12px 20px 24px; }
    .am-form-fields { gap: 8px; }
    .am-field__label { display: none; }
    .am-field__inner { height: 44px; }
    .am-btn { height: 44px; }
  }

  @media (min-width: 641px) {
    .am-modal { border-radius: 16px; }
    .am-field__inner:hover:not(:focus-within) { border-color: #d1d5db; }
  }

  @media (prefers-reduced-motion: reduce) {
    .am-tabs__indicator, .am-btn, .am-field__inner { transition: none !important; }
    .am-modal, .am-content__inner, .am-toast-wrap, .am-force-card { animation: none !important; }
  }
`;