import './LanguageToggle.css';

export default function LanguageToggle({ lang, onChange }) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'es' ? 'is-active' : ''}`}
        aria-pressed={lang === 'es'}
        onClick={() => onChange('es')}
      >
        ES
      </button>
      <span className="lang-toggle__sep" aria-hidden="true">/</span>
      <button
        type="button"
        className={`lang-toggle__btn ${lang === 'en' ? 'is-active' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
}
