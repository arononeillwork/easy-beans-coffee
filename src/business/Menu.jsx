import { useEffect, useState } from 'react';
import LanguageToggle from './LanguageToggle.jsx';
import { drinkSections, foodSections, t } from './menuData.js';
import './Menu.css';

const STORAGE_KEY = 'ebc:lang';
const DEFAULT_LANG = 'es';
const INSTAGRAM_URL = 'https://www.instagram.com/easy.beans.coffee/';

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'es' ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function MenuSection({ section, lang }) {
  const hasDualPrice = section.items.some(
    (item) => item.priceHot || item.priceIced
  );

  return (
    <section className="menu-section" aria-labelledby={`sec-${section.id}`}>
      <h2 id={`sec-${section.id}`} className="menu-section__title">
        {section.title[lang]}
      </h2>

      {hasDualPrice && (
        <div className="menu-price-head" aria-hidden="true">
          <span className="menu-price-col">{t.hot[lang]}</span>
          <span className="menu-price-col">{t.iced[lang]}</span>
        </div>
      )}

      <ul className="menu-list">
        {section.items.map((item, i) => (
          <li key={i} className="menu-item">
            <span className="menu-item__name">
              {item.name[lang]}
              {item.badge && (
                <span className="menu-item__badge">{item.badge[lang]}</span>
              )}
            </span>
            <span className="menu-item__leader" aria-hidden="true" />
            {hasDualPrice ? (
              <span className="menu-item__prices">
                <span className="menu-price-col menu-item__price">
                  {item.priceHot ?? ''}
                </span>
                <span className="menu-price-col menu-item__price">
                  {item.priceIced ?? ''}
                </span>
              </span>
            ) : (
              <span className="menu-item__price">{item.price ?? ''}</span>
            )}
          </li>
        ))}

        {section.extras?.map((extra, i) => (
          <li key={`x-${i}`} className="menu-item menu-item--muted">
            <span className="menu-item__name">{extra.name[lang]}</span>
            <span className="menu-item__leader" aria-hidden="true" />
            <span className="menu-item__price">{extra.price}</span>
          </li>
        ))}
      </ul>

      {(section.notes ?? (section.note ? [section.note] : [])).map((note, ni) => (
        <div key={ni} className="menu-note">
          <p className="menu-note__heading">{note.heading[lang]}</p>
          <ul className="menu-note__options">
            {note.options.map((opt, i) => (
              <li key={i}>{opt[lang]}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function Menu() {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [tab, setTab] = useState('drinks');

  useEffect(() => {
    setLang(readStoredLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'es'
        ? 'Carta · Easy Beans Coffee'
        : 'Menu · Easy Beans Coffee';
  }, [lang]);

  function handleLangChange(next) {
    setLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const sections = tab === 'drinks' ? drinkSections : foodSections;

  return (
    <div className="menu-shell">
      <header className="menu-tabs" aria-label="Menu navigation">
        <div className="menu-tabs__inner">
          <a href="/" className="wordmark" aria-label="Easy Beans Coffee">
            <span className="wordmark__name">Easy Beans</span>
            <span className="wordmark__rule" aria-hidden="true">
              <span className="wordmark__line" />
              <span className="wordmark__coffee">COFFEE</span>
              <span className="wordmark__line" />
            </span>
          </a>
          <nav className="menu-tabs__nav" aria-label="Menu sections">
            <button
              type="button"
              className={`menu-tab ${tab === 'drinks' ? 'is-active' : ''}`}
              aria-pressed={tab === 'drinks'}
              onClick={() => setTab('drinks')}
            >
              {t.drinks[lang]}
            </button>
            <button
              type="button"
              className={`menu-tab ${tab === 'food' ? 'is-active' : ''}`}
              aria-pressed={tab === 'food'}
              onClick={() => setTab('food')}
            >
              {t.food[lang]}
            </button>
          </nav>
          <div className="menu-tabs__lang">
            <LanguageToggle lang={lang} onChange={handleLangChange} />
          </div>
        </div>
      </header>

      <main className="menu-page">
        <p className="menu-intro">{t.tagline[lang]}</p>

        <div className="menu-grid">
          {sections.map((section) => (
            <MenuSection key={section.id} section={section} lang={lang} />
          ))}
        </div>
      </main>

      <footer className="menu-footer">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="menu-footer__handle"
        >
          @easy.beans.coffee
        </a>
      </footer>
    </div>
  );
}
