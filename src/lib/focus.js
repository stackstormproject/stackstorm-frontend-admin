/** After a failed submit, move focus to the first invalid field so keyboard users land on it. */
export const focusFirstError = (form) => {
  window.requestAnimationFrame(() => {
    const target = form?.querySelector('[aria-invalid="true"]');
    if (target) target.focus();
  });
};
