import { useId } from 'react';

/**
 * Label + input + error, wired for screen readers (aria-invalid, aria-describedby).
 * Pass `as="select"` or `as="textarea"` for other controls.
 */
export function FormField({
  label,
  error,
  hint,
  as: Control = 'input',
  children,
  ...controlProps
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <Control
        id={id}
        className="field__control"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
