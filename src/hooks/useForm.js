import { useCallback, useMemo, useRef, useState } from 'react';
import { SubmitError } from '../services/submissions';

// Shared state for the registration forms: values, touched fields, derived
// errors (shown after blur or a submit attempt) and the submission outcome.
export function useForm(initial, validate, t) {
  const [values, setValuesState] = useState(initial);
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | busy | preview | sent
  const [formError, setFormError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const inFlight = useRef(false);

  const errors = useMemo(() => ({ ...validate(values, t), ...serverErrors }), [values, t, validate, serverErrors]);

  const setValue = useCallback((key, value) => {
    setValuesState((v) => ({ ...v, [key]: value }));
    setServerErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);
  const setValues = useCallback((update) => {
    setValuesState(update);
    setServerErrors({});
  }, []);
  const touch = useCallback((key) => setTouched((s) => ({ ...s, [key]: true })), []);
  // Blur handler that validates a field when the user moves on — but not when
  // focus is leaving towards a dismiss control (Cancel / close).
  const blur = useCallback(
    (key) => (e) => {
      if (e?.relatedTarget?.closest?.('[data-dismiss]')) return;
      touch(key);
    },
    [touch],
  );
  const errorFor = (key) => (attempted || touched[key] ? errors[key] : undefined);

  const reset = useCallback(() => {
    setValuesState(initial);
    setTouched({});
    setAttempted(false);
    setStatus('idle');
    setFormError('');
    setServerErrors({});
    inFlight.current = false;
  }, [initial]);

  // Runs `send` only when the form is valid; maps API field errors to controls.
  const run = async (send) => {
    if (inFlight.current || status === 'busy') return false;
    setAttempted(true);
    setFormError('');
    if (Object.keys(errors).length) {
      setFormError(t.errors.checkFields);
      return false;
    }
    inFlight.current = true;
    setStatus('busy');
    try {
      const { sent } = await send();
      setStatus(sent ? 'sent' : 'preview');
      return true;
    } catch (err) {
      setStatus('idle');
      if (err instanceof SubmitError && err.kind === 'server' && err.details.length) {
        const fields = Object.fromEntries(err.details.filter((item) => item.field).map((item) => [item.field, item.message]));
        setServerErrors(fields);
        setFormError(Object.keys(fields).length ? t.errors.checkFields : t.errors.generic);
      } else {
        setFormError(err instanceof SubmitError && err.kind === 'network' ? t.errors.network : t.errors.generic);
      }
      return false;
    } finally {
      inFlight.current = false;
    }
  };

  return { values, setValue, touch, blur, errorFor, errors, status, formError, reset, run, setValues };
}