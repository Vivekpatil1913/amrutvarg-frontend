import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Mandala from '../components/Mandala';
import { FormError } from '../components/FormControls';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchFeedback, sendFeedback } from '../services/grievance';

// The complainant's closure loop: reached from the SMS / e-mail sent when a
// ticket is resolved. Shows the action taken and asks for a 1-5 rating.
export default function GrievanceFeedbackPage() {
  const { token } = useParams();
  const { t, num } = useLanguage();
  const g = t.grievance;
  const [state, setState] = useState({ status: 'loading', ticket: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchFeedback(token)
      .then((ticket) => alive && setState({ status: ticket.rated ? 'done' : 'ready', ticket }))
      .catch(() => alive && setState({ status: 'invalid', ticket: null }));
    return () => { alive = false; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError(g.rating); return; }
    setBusy(true);
    setError('');
    try {
      await sendFeedback(token, rating, comment.trim());
      setState((s) => ({ ...s, status: 'done' }));
    } catch (err) {
      setError(err.message || t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const { ticket } = state;
  const resolved = ticket && ['RESOLVED', 'CLOSED'].includes(ticket.status);

  return (
    <section className="spage" aria-labelledby="fb-title">
      <Mandala className="spage__mandala" points={20} />
      <div className="container grievance">
        <header className="spage__head">
          <h1 id="fb-title" className="section__title">{g.feedbackTitle}</h1>
          {ticket ? <p className="section__lead">{g.ticket} {ticket.ticket_no} · {ticket.subject}</p> : null}
        </header>
        <div className="grievance__panel">
          {state.status === 'loading' ? <p className="spage__loading" role="status">…</p> : null}
          {state.status === 'invalid' ? (
            <div className="sempty"><Icon name="alert" size={22} /><p>{g.invalidLink}</p></div>
          ) : null}
          {state.status === 'done' ? (
            <div className="result result--success" role="status">
              <span className="result__icon"><Icon name="checkCircle" size={28} /></span>
              <h2 className="result__title">{g.thanks}</h2>
              <div className="result__actions"><Link to="/" className="btn btn--primary">{t.nav.home}</Link></div>
            </div>
          ) : null}
          {state.status === 'ready' && !resolved ? (
            <div className="sempty"><Icon name="clock" size={22} /><p>{g.notReady}</p></div>
          ) : null}
          {state.status === 'ready' && resolved ? (
            <form className="form" onSubmit={submit} noValidate>
              <p className="field__hint">{g.feedbackDesc}</p>
              <div className="grievance__action">
                <p className="melawa-card__label">{g.actionTaken}</p>
                <p>{ticket.action_taken_notes}</p>
              </div>
              <fieldset className="grievance__rating">
                <legend className="field__label">{g.rating}</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={`grievance__star${rating >= n ? ' is-on' : ''}`}>
                    <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                    <span aria-hidden="true">★</span>
                    <span className="sr-only">{num(n)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="field field--wide">
                <label htmlFor="fb-comment" className="field__label">{g.comment}</label>
                <textarea id="fb-comment" className="input" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <FormError message={error} />
              <div className="form-actions">
                <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? t.common.submitting : g.sendRating}</button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
