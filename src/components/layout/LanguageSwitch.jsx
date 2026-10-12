import { LANGUAGES } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

export default function LanguageSwitch({ className = '' }) {
  const { lang, setLang, t } = useLanguage();
  const index = LANGUAGES.findIndex((l) => l.code === lang);

  return (
    <div
      className={`lang-switch ${className}`}
      role="group"
      aria-label={t.a11y.language}
      style={{ '--index': index }}
    >
      <span className="lang-switch__thumb" aria-hidden="true" />
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={`lang-switch__btn${lang === code ? ' is-active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
