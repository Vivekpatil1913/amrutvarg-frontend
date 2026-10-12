import { useCallback, useMemo, useState } from 'react';
import { SubmitError } from '../services/submissions';

// Shared state for the registration forms: values, touched fields, derived
// errors (shown after blur or a submit attempt) and the submission outcome.
export function useForm(initial, validate, t) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | busy | preview | sent
  const [formError, setFormError] = useState('');

  const errors = useMemo(() => validate(values, t), [values, t, validate]);

  const setValue = useCallback((key, value) => setValues((v) => ({ ...v, [key]: value })), []);
  const touch = useCallback((key) => setTouched((s) => ({ ...s, [key]: true })), []);
  // Blur handler that validates a field when the user moves on — but not when
  // focus is leaving towards a dismiss control (Cancel / close), so cancelling
  // never flashes "required" errors.
  const blur = useCallback(
    (key) => (e) => {
      if (e?.relatedTarget?.closest?.('[data-dismiss]')) return;
      touch(key);
    },
    [touch],
  );
  const errorFor = (key) => (attempted || touched[key] ? errors[key] : undefined);

  const reset = useCallback(() => {
    setValues(initial);
    setTouched({});
    setAttempted(false);
    setStatus('idle');
    setFormError('');
  }, [initial]);

  // Runs `send` only when the form is valid; maps the outcome to a status.
  const run = async (send) => {
    setAttempted(true);
    setFormError('');
    if (Object.keys(errors).length) {
      setFormError(t.errors.checkFields);
      return false;
    }
    setStatus('busy');
    try {
      const { sent } = await send();
      setStatus(sent ? 'sent' : 'preview');
      return true;
    } catch (err) {
      setStatus('idle');
      setFormError(err instanceof SubmitError && err.kind === 'network' ? t.errors.network : t.errors.generic);
      return false;
    }
  };

  return { values, setValue, touch, blur, errorFor, errors, status, formError, reset, run, setValues };
}
