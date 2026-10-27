import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data with explicit loading / error / data states and ignores responses that
 * arrive after the inputs changed or the component unmounted.
 *
 * @param {() => Promise<any>} load - called whenever `deps` change
 * @param {any[]} deps
 * @returns {{ data: any, error: Error|null, loading: boolean, reload: () => void, setData: Function }}
 */
export function useResource(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, error: null, loading: true }));
    // Promise.resolve().then() also captures a loader that throws synchronously.
    Promise.resolve()
      .then(() => loadRef.current())
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      })),
    []
  );

  return { ...state, reload, setData };
}
