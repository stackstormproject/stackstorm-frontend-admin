import { useState } from 'react';
import { FormField } from './FormField';

/** Password input with a show/hide toggle that screen readers announce. */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <FormField {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="btn btn--ghost btn--small password-field__toggle"
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Hide' : 'Show'}
        <span className="visually-hidden"> password</span>
      </button>
    </div>
  );
}
