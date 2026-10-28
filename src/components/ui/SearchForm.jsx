import { useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';

/** Search box that applies on submit (Enter), so each keystroke does not hit the API. */
export function SearchForm({ label, placeholder, value, onSearch }) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <form
      role="search"
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
    >
      <label htmlFor={id} className="field__label">
        Search {label}
      </label>
      <div className="search-form__row">
        <input
          id={id}
          type="search"
          className="field__control"
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn--secondary" aria-label="Search">
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
