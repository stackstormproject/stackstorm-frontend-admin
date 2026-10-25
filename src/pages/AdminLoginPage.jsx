import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAuthApi, DEMO_ADMIN_ACCOUNTS } from '../api/adminAuth.api';
import './AdminLoginPage.css';

export default function AdminLoginPage({ onLoginSuccess }) {
  const { login } = useAdminAuth();

  const [email, setEmail] = useState('admin@stackstorm.lk');
  const [password, setPassword] = useState('AdminPassword123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleQuickFill = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both administrator email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await adminAuthApi.loginAdmin({ email, password });
      login(result.user, result.token);
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Invalid administrator credentials. Access to control room denied.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-viewport" data-testid="admin-login-page">
      {/* Background Ambient Glow */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />

      <div className="admin-login-card">
        {/* Brand Banner */}
        <div className="login-brand-header">
          <div className="brand-badge-box">
            <ShieldAlert size={28} className="brand-logo-icon" />
          </div>
          <span className="brand-kicker">Dickwella Fashion Corner Operations</span>
          <h1 className="brand-login-title">StackStorm Control Room</h1>
          <p className="brand-login-subtitle">
            Restricted Executive & Inventory Staff Access Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-alert" role="alert" data-testid="login-error-alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="login-form-group">
            <label htmlFor="admin-email">Administrator Email</label>
            <div className="login-input-box">
              <Mail size={16} className="login-input-icon" />
              <input
                id="admin-email"
                type="email"
                placeholder="admin@stackstorm.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                data-testid="admin-email-input"
              />
            </div>
          </div>

          <div className="login-form-group">
            <div className="form-label-row">
              <label htmlFor="admin-password">Secure Password</label>
            </div>
            <div className="login-input-box">
              <Lock size={16} className="login-input-icon" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                data-testid="admin-password-input"
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
            data-testid="admin-login-submit-btn"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <KeyRound size={16} />
                <span>Sign In to Control Room</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Role Fillers */}
        <div className="quick-roles-section">
          <span className="quick-roles-title">
            <ShieldCheck size={12} />
            <span>Quick-Fill Operator Profiles (Evaluation)</span>
          </span>
          <div className="quick-roles-grid">
            {DEMO_ADMIN_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="quick-role-btn"
                onClick={() => handleQuickFill(acc)}
                title={`Fill credentials for ${acc.user.name} (${acc.user.role})`}
              >
                <span className="role-btn-name">{acc.user.name}</span>
                <span className="role-btn-role">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="login-card-footer">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="storefront-link"
          >
            <span>Return to Customer Storefront</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="login-portal-credits">
        <span>StackStorm Enterprise • Dickwella Fashion Corner Operations</span>
      </div>
    </div>
  );
}
