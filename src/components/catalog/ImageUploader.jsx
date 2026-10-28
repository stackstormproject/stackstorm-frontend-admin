import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { uploadImages } from '../../api/products';
import { imageFileProblem, MAX_EXTRA_IMAGES } from '../../lib/productForm';

/**
 * Main photo plus up to three extra photos (#179). Each slot uploads one file to the backend
 * and stores the returned link; an extra photo can be made the main one or removed.
 */
export function ImageUploader({ main, extras, onChange, error }) {
  const [busySlot, setBusySlot] = useState(null);
  const [problem, setProblem] = useState(null);
  const inputs = useRef([]);
  const slots = [
    main || null,
    ...Array.from({ length: MAX_EXTRA_IMAGES }, (_, i) => extras[i] || null),
  ];

  const save = (nextSlots) => {
    const [nextMain, ...rest] = nextSlots;
    onChange({ primary_image: nextMain || '', gallery_images: rest.filter(Boolean) });
  };

  const pick = async (index, file) => {
    if (!file) return;
    const reason = imageFileProblem(file);
    if (reason) {
      setProblem(reason);
      return;
    }
    setProblem(null);
    setBusySlot(index);
    try {
      const {
        urls: [url],
      } = await uploadImages([file]);
      const next = [...slots];
      // An extra photo added while there is no main photo becomes the main photo.
      next[index > 0 && !next[0] ? 0 : index] = url;
      save(next);
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusySlot(null);
    }
  };

  const remove = (index) => save(slots.map((url, i) => (i === index ? null : url)));
  const makeMain = (index) => {
    const next = [...slots];
    [next[0], next[index]] = [next[index], next[0]];
    save(next);
  };

  return (
    <fieldset className="image-uploader">
      <legend className="field__label">Photos</legend>
      <p className="field__hint">
        A main photo and up to three more. JPEG, PNG or WebP, up to 5 MB each.
      </p>
      <ul className="image-uploader__slots">
        {slots.map((url, index) => {
          const label = index === 0 ? 'Main photo' : `Extra photo ${index}`;
          return (
            // eslint-disable-next-line react/no-array-index-key -- slots are fixed positions
            <li key={index} className={`image-slot ${index === 0 ? 'image-slot--main' : ''}`}>
              {url ? (
                <>
                  <img src={url} alt={label} className="image-slot__preview" />
                  <div className="image-slot__tools">
                    {index > 0 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Make ${label.toLowerCase()} the main photo`}
                        title="Make main photo"
                        onClick={() => makeMain(index)}
                      >
                        <Star size={16} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${label.toLowerCase()}`}
                      title="Remove"
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                  {index === 0 && <span className="image-slot__badge">Main</span>}
                </>
              ) : (
                <button
                  type="button"
                  className="image-slot__add"
                  disabled={busySlot !== null}
                  onClick={() => inputs.current[index]?.click()}
                >
                  <ImagePlus size={22} aria-hidden="true" />
                  {busySlot === index ? 'Uploading…' : `Add ${label.toLowerCase()}`}
                </button>
              )}
              <input
                ref={(el) => {
                  inputs.current[index] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="visually-hidden"
                tabIndex={-1}
                aria-label={`Choose ${label.toLowerCase()}`}
                onChange={(event) => {
                  pick(index, event.target.files?.[0]);
                  // eslint-disable-next-line no-param-reassign -- lets the same file be picked again
                  event.target.value = '';
                }}
              />
            </li>
          );
        })}
      </ul>
      {(problem || error) && (
        <p className="field__error" role="alert">
          {problem || error}
        </p>
      )}
    </fieldset>
  );
}
