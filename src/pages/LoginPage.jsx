import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { FormField } from '../components/ui/FormField';
import { PasswordField } from '../components/ui/PasswordField';
import { Brand } from '../components/layout/Brand';
import { LoadingState } from '../components/ui/States';
import { describeSignInError, safeNext, validateSignIn } from '../lib/authErrors';
import { homePathFor } from '../lib/roles';

export default function LoginPage() {
  const { admin, status, sessionEnded, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (status === 'checking') {
    return (
      <div className="state--page state">
        <LoadingState label="Checking your session" />
      </div>
    );
  }
  if (status === 'signedIn' && !busy) return <Navigate to={next || homePathFor(admin)} replace />;

  const update = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validateSignIn(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const signedIn = await signIn({ email: values.email.trim(), password: values.password });
      navigate(next || homePathFor(signedIn), { replace: true });
    } catch (error) {
      const { form, fields } = describeSignInError(error);
      setFormError(form);
      setErrors(fields);
      setValues((v) => ({ ...v, password: '' }));
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <div className="login__panel">
        <Brand to="/login" />
        <div className="card">
          <h1>Staff sign in</h1>
          <p className="muted">For store managers and support agents.</p>
          <form className="login__form" onSubmit={submit} noValidate>
            {sessionEnded && !formError && (
              <p className="callout callout--info" role="status">
                Your session ended. Sign in again to continue.
              </p>
            )}
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <FormField
              label="Work email"
              type="email"
              autoComplete="username"
              value={values.email}
              onChange={update('email')}
              error={errors.email}
              required
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              required
            />
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="login__note">
          Accounts are created by a super admin. After five failed attempts an account is locked for
          15 minutes.
        </p>
      </div>
    </main>
  );
}
