import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Globe,
  Shield,
  MapPin,
  Leaf,
  AlertCircle,
  CheckCircle2,
  X,
  HelpCircle,
  Check,
  Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Dynamic registered accounts storage (fallback)
  const [registeredUsers, setRegisteredUsers] = useState({});

  // Registration fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Login processing state
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Real-time password criteria verification
  const passwordCriteria = {
    minLength: regPassword.length >= 8,
    hasUpper: /[A-Z]/.test(regPassword),
    hasLower: /[a-z]/.test(regPassword),
    hasNumber: /[0-9]/.test(regPassword),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(regPassword)
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const validateUsername = (val) => {
    const clean = val ? val.trim() : '';
    if (!clean) return 'Username is required.';
    if (clean.length < 3) return 'Username must be at least 3 characters long.';
    if (clean.length > 30) return 'Username must be 30 characters or fewer.';
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
      return 'Username can only contain letters, numbers, underscores, periods, and hyphens.';
    }
    const reserved = ['admin', 'officer', 'system', 'root', 'supervisor'];
    if (reserved.includes(clean.toLowerCase())) {
      return 'This username is reserved. Please choose another username.';
    }
    return null;
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password.trim()) {
      setError('Please enter both your username/email and password.');
      return;
    }

    const u = trimmedUser.toLowerCase();

    // 1. Administrator - Directorate (Demo Account)
    if ((u === 'admin' || u === 'admin@traffic.gov') && password === 'admin123') {
      onLoginSuccess({
        username: 'admin',
        fullName: 'System Administrator',
        email: 'admin@traffic.gov',
        role: 'ADMINISTRATOR',
        department: 'City Traffic Control Directorate'
      });
      return;
    }

    // 2. Administrator - Division Officer (Demo Account)
    if ((u === 'officer' || u === 'officer@traffic.gov') && password === 'officer123') {
      onLoginSuccess({
        username: 'officer',
        fullName: 'Officer Priya Nair',
        email: 'officer@traffic.gov',
        role: 'ADMINISTRATOR',
        department: 'Central Signal Operations Division'
      });
      return;
    }

    // 3. Public User - Commuter (Demo Account)
    if ((u === 'user' || u === 'aditya@commuter.org') && password === 'user123') {
      onLoginSuccess({
        username: 'user',
        fullName: 'Aditya Sharma',
        email: 'aditya@commuter.org',
        role: 'PUBLIC',
        department: 'Daily Commuter'
      });
      return;
    }

    // 4. Public User - Citizen Transit (Demo Account)
    if ((u === 'citizen' || u === 'ananya@citizen.org') && password === 'citizen123') {
      onLoginSuccess({
        username: 'citizen',
        fullName: 'Ananya Sen',
        email: 'ananya@citizen.org',
        role: 'PUBLIC',
        department: 'Urban Transit User'
      });
      return;
    }

    // 5. Check in-memory registered public users fallback
    const matchedRegistered = Object.values(registeredUsers).find(
      (acc) =>
        (acc.username.toLowerCase() === u || acc.email.toLowerCase() === u) &&
        acc.password === password
    );

    if (matchedRegistered) {
      onLoginSuccess({
        username: matchedRegistered.username,
        fullName: matchedRegistered.fullName,
        email: matchedRegistered.email,
        role: 'PUBLIC',
        department: 'Registered Commuter'
      });
      return;
    }

    // 6. Supabase Authentication for Citizen Registration Accounts
    setIsLoggingIn(true);
    try {
      let loginEmail = trimmedUser;

      // If user typed a username without @, inform them to use their registered email if needed
      if (!loginEmail.includes('@')) {
        setError('Please enter your registered email address to sign in.');
        setIsLoggingIn(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('email not confirmed')) {
          setError(
            'Your email address has not been verified yet. Please check your inbox and verify your email before signing in.'
          );
        } else if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid email or password. Please verify your credentials and try again.');
        } else {
          setError(authError.message || 'Authentication failed. Please verify your credentials.');
        }
        setIsLoggingIn(false);
        return;
      }

      if (data?.user) {
        let fullName = data.user.user_metadata?.full_name || 'Registered Commuter';
        let userNameVal = data.user.user_metadata?.username || data.user.email.split('@')[0];

        // Retrieve saved profile info from public.profiles
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', data.user.id)
            .maybeSingle();

          if (prof) {
            if (prof.full_name) fullName = prof.full_name;
            if (prof.username) userNameVal = prof.username;
          }
        } catch (pErr) {
          console.warn('Profile lookup notice:', pErr);
        }

        // STRICT REQUIREMENT: Public registrations must never receive administrator privileges
        onLoginSuccess({
          id: data.user.id,
          username: userNameVal,
          fullName: fullName,
          email: data.user.email,
          role: 'PUBLIC',
          department: 'Registered Commuter'
        });
        setIsLoggingIn(false);
        return;
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      setError(err?.message || 'Invalid username or password. Please verify your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setRegError('');
    setError('');
    setSuccessMsg('');

    const cleanFullName = regFullName.trim();
    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim();

    if (!cleanFullName) {
      setRegError('Please enter your full name.');
      return;
    }

    const usernameErr = validateUsername(cleanUsername);
    if (usernameErr) {
      setRegError(usernameErr);
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRegError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      setRegError('Password does not meet all complexity requirements.');
      return;
    }

    setRegLoading(true);

    try {
      // 1. Verify username uniqueness against public.profiles
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', cleanUsername)
        .limit(1);

      if (!checkError && existingProfiles && existingProfiles.length > 0) {
        setRegError(`The username "${cleanUsername}" is already taken. Please choose another username.`);
        setRegLoading(false);
        return;
      }

      // 2. Invoke Supabase Auth signUp with metadata options
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: regPassword,
        options: {
          data: {
            full_name: cleanFullName,
            username: cleanUsername
          }
        }
      });

      if (signUpError) {
        // Display actual safe Supabase error message
        setRegError(signUpError.message || 'Registration failed. Please try again.');
        setRegLoading(false);
        return;
      }

      // Supabase returns an empty identities array if an existing user signs up with email confirmation enabled
      if (data?.user?.identities && data.user.identities.length === 0) {
        setRegError('An account with this email address already exists. Please sign in instead.');
        setRegLoading(false);
        return;
      }

      const hasActiveSession = Boolean(data?.session);

      // Client-side fallback insert if session is active (e.g. if email confirmation is disabled)
      if (hasActiveSession && data?.user?.id) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: cleanFullName,
            username: cleanUsername
          });
        } catch (upsertErr) {
          console.warn('Profile client-side sync notice:', upsertErr);
        }
      }

      // Maintain in-memory fallback cache
      const newUser = {
        username: cleanUsername,
        fullName: cleanFullName,
        email: cleanEmail,
        password: regPassword,
        role: 'PUBLIC'
      };
      setRegisteredUsers((prev) => ({
        ...prev,
        [cleanUsername.toLowerCase()]: newUser,
        [cleanEmail.toLowerCase()]: newUser
      }));

      // Pre-fill login credentials so the user can easily sign in
      setUsername(cleanEmail);
      setPassword(regPassword);
      setShowRegisterModal(false);

      // Reset registration form fields
      setRegFullName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegError('');
      setRegLoading(false);

      if (!hasActiveSession) {
        setSuccessMsg(
          `Account registered for ${cleanFullName}! A confirmation email was sent to ${cleanEmail}. Please check your inbox and verify your email before signing in.`
        );
      } else {
        setSuccessMsg(
          `Account registered successfully for ${cleanFullName}! Credentials have been filled. You can now sign in.`
        );
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegError(err?.message || 'An unexpected error occurred during registration. Please try again.');
      setRegLoading(false);
    }
  };


  return (
    <div className="login-page-container">
      {/* LEFT SPLIT PANEL: Exactly preserved as per requirements */}
      <div className="login-left-panel">
        <img
          src="/images/login_left_panel.png"
          alt="Smart Traffic Control Visual Banner"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={(e) => {
            // Fallback gracefully to high-res background if standalone image fails
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Fallback Overlay if image is loading or custom high-res rendering */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 50,
            background: 'linear-gradient(135deg, rgba(6, 40, 77, 0.95) 0%, rgba(13, 59, 102, 0.85) 100%)'
          }}
          id="left-fallback"
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.12)',
                padding: '8px 14px',
                borderRadius: 8,
                marginBottom: 24
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              </div>
              <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>STC System</span>
            </div>
            <h1 style={{ color: '#FFF', fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
              SMART TRAFFIC CONTROL
            </h1>
            <h2 style={{ color: '#93C5FD', fontSize: 20, fontWeight: 700, margin: '6px 0 16px' }}>
              FOR URBAN CONGESTION
            </h2>
            <div style={{ width: 44, height: 3, background: '#38BDF8', borderRadius: 2, marginBottom: 20 }} />
            <p style={{ color: '#E2E8F0', fontSize: 15, lineHeight: 1.6 }}>
              Smarter roads. Safer journeys.
              <br />A more connected tomorrow.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}
              >
                <MapPin size={18} color="#FFF" />
              </div>
              <div style={{ color: '#E2E8F0', fontSize: 11, maxWidth: 90 }}>
                Real-time Traffic Monitoring
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}
              >
                <Shield size={18} color="#FFF" />
              </div>
              <div style={{ color: '#E2E8F0', fontSize: 11, maxWidth: 90 }}>
                Efficient Traffic Management
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px'
                }}
              >
                <Leaf size={18} color="#FFF" />
              </div>
              <div style={{ color: '#E2E8F0', fontSize: 11, maxWidth: 90 }}>
                Sustainable Urban Mobility
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SPLIT PANEL: Polished Enterprise Traffic Operations Login */}
      <div className="login-right-panel">
        {/* Top Header Utility Bar */}
        <div className="login-top-bar">
          <div className="system-status-indicator">
            <span className="status-pulse-dot" />
            <span>Operational Network • STC v2.0</span>
          </div>

          <div className="language-selector" title="System Language">
            <Globe size={15} color="#475569" />
            <span>English (US)</span>
          </div>
        </div>

        {/* Center Login Form Container */}
        <div className="login-form-wrapper">
          {/* Subtle Platform Tag */}
          <div className="login-portal-tag">
            <Shield size={12} />
            <span>Traffic Operations Gateway</span>
          </div>

          {/* Heading and Subtitle */}
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            Sign in to access your traffic management and urban mobility console.
          </p>

          {/* Status Alert Banners */}
          {error && (
            <div className="login-alert-error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="login-alert-success" role="status">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} noValidate>
            {/* Email / Username Input */}
            <div className="login-form-group">
              <label htmlFor="login-username" className="login-form-label">
                Email or Username
              </label>
              <div className="login-input-container">
                <User size={18} className="login-input-icon" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your email or username"
                  className="login-input"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="login-form-group">
              <label htmlFor="login-password" className="login-form-label">
                Password
              </label>
              <div className="login-input-container">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  className="login-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="login-password-toggle"
                >
                  {showPassword ? <EyeOff size={18} color="#0284C7" /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Links */}
            <div className="login-options-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="login-forgot-link"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              id="btn-login-submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Public Registration Link */}
            <div className="login-register-prompt">
              <span>Don't have an account?</span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setShowRegisterModal(true);
                }}
                className="login-register-link"
              >
                Register as Public User
              </button>
            </div>
          </form>
        </div>

        {/* Professional Enterprise Footer */}
        <div className="login-footer-text">
          <div>Smart Traffic Control 2.0 • Urban Congestion Management Platform</div>
          <div style={{ marginTop: 4, color: '#94A3B8', fontSize: 11 }}>
            Authorized Personnel & Commuters Only • Secure Operations Gateway
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="login-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={18} color="#0284C7" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                    Password Recovery
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                    Traffic Management Access Protocol
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, padding: '12px 0' }}>
              <p style={{ marginBottom: 10 }}>
                In compliance with urban transport cybersecurity protocols, credentials cannot be reset unassisted.
              </p>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: 12.5, color: '#334155' }}>
                <div style={{ fontWeight: 600, color: '#0A2540', marginBottom: 4 }}>
                  • Control Center & Officers:
                </div>
                <div style={{ marginBottom: 8 }}>
                  Contact your Shift Supervisor or internal dispatch IT administrator.
                </div>
                <div style={{ fontWeight: 600, color: '#0A2540', marginBottom: 4 }}>
                  • Public Commuters:
                </div>
                <div>
                  Register a new public commuter account or verify your registered email.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Public User Registration Modal */}
      {showRegisterModal && (
        <div className="login-modal-backdrop" onClick={() => !regLoading && setShowRegisterModal(false)}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} color="#166534" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0A2540', margin: 0 }}>
                    Register as Public User
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                    Create a commuter profile for real-time route optimization.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={regLoading}
                onClick={() => {
                  setRegError('');
                  setShowRegisterModal(false);
                }}
                style={{ background: 'none', border: 'none', cursor: regLoading ? 'not-allowed' : 'pointer', color: '#94A3B8', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* In-modal Error Banner */}
            {regError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '9px 12px',
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 500,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
                role="alert"
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, wordBreak: 'break-word' }}>{regError}</div>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {/* Full Name */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={regLoading}
                  value={regFullName}
                  onChange={(e) => {
                    setRegFullName(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="e.g. Rahul Sharma"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 7,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Username <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={regLoading}
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="e.g. rahul24 (at least 3 characters)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 7,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Email Address */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={regLoading}
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (regError) setRegError('');
                  }}
                  placeholder="e.g. rahul@example.com"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 7,
                    border: '1.5px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={regShowPassword ? 'text' : 'password'}
                    required
                    disabled={regLoading}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (regError) setRegError('');
                    }}
                    placeholder="Create a strong password"
                    style={{
                      width: '100%',
                      padding: '9px 38px 9px 12px',
                      borderRadius: 7,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    tabIndex={-1}
                    aria-label={regShowPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {regShowPassword ? <EyeOff size={16} color="#0284C7" /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '9px 12px',
                    background: '#F8FAFC',
                    borderRadius: 7,
                    border: '1px solid #E2E8F0',
                    fontSize: 11.5
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                    Password must satisfy:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: passwordCriteria.minLength ? '#16A34A' : '#94A3B8',
                        fontWeight: passwordCriteria.minLength ? 600 : 400
                      }}
                    >
                      <Check size={13} style={{ strokeWidth: passwordCriteria.minLength ? 3 : 2 }} />
                      <span>At least 8 characters</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: passwordCriteria.hasUpper ? '#16A34A' : '#94A3B8',
                        fontWeight: passwordCriteria.hasUpper ? 600 : 400
                      }}
                    >
                      <Check size={13} style={{ strokeWidth: passwordCriteria.hasUpper ? 3 : 2 }} />
                      <span>1 uppercase (A-Z)</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: passwordCriteria.hasLower ? '#16A34A' : '#94A3B8',
                        fontWeight: passwordCriteria.hasLower ? 600 : 400
                      }}
                    >
                      <Check size={13} style={{ strokeWidth: passwordCriteria.hasLower ? 3 : 2 }} />
                      <span>1 lowercase (a-z)</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: passwordCriteria.hasNumber ? '#16A34A' : '#94A3B8',
                        fontWeight: passwordCriteria.hasNumber ? 600 : 400
                      }}
                    >
                      <Check size={13} style={{ strokeWidth: passwordCriteria.hasNumber ? 3 : 2 }} />
                      <span>1 number (0-9)</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: passwordCriteria.hasSpecial ? '#16A34A' : '#94A3B8',
                        fontWeight: passwordCriteria.hasSpecial ? 600 : 400,
                        gridColumn: 'span 2'
                      }}
                    >
                      <Check size={13} style={{ strokeWidth: passwordCriteria.hasSpecial ? 3 : 2 }} />
                      <span>1 special character (!@#$%^&*...)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={regLoading}
                  onClick={() => {
                    setRegError('');
                    setShowRegisterModal(false);
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading || !isPasswordValid}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    opacity: regLoading || !isPasswordValid ? 0.7 : 1,
                    cursor: regLoading || !isPasswordValid ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {regLoading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{regLoading ? 'Registering...' : 'Register Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
