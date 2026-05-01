import { useEffect, useState } from 'react';
import LanguageToggle from './LanguageToggle.jsx';
import { drinkSections, foodSections, allergenInfo, t } from './menuData.js';
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

function AllergenBadges({ codes, lang }) {
  if (!codes || codes.length === 0) return null;
  return (
    <span className="menu-item__allergens" aria-label={t.allergensHeading[lang]}>
      {codes.map((code) => {
        const info = allergenInfo[code];
        return (
          <span
            key={code}
            className="allergen-dot"
            style={{ background: info.color }}
            title={info.label[lang]}
            aria-label={info.label[lang]}
          >
            {info.short}
          </span>
        );
      })}
    </span>
  );
}

function MenuSection({ section, lang, showAllergens }) {
  return (
    <section className="menu-section" aria-labelledby={`sec-${section.id}`}>
      <h2 id={`sec-${section.id}`} className="menu-section__title">
        {section.title[lang]}
      </h2>

      <ul className="menu-list">
        {section.items.map((item, i) => (
          <li key={i} className="menu-item">
            <span className="menu-item__name">
              {item.name[lang]}
              {showAllergens && <AllergenBadges codes={item.allergens} lang={lang} />}
            </span>
            <span className="menu-item__leader" aria-hidden="true" />
            <span className="menu-item__price">{item.price ?? ''}</span>
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

      {section.note && (
        <div className="menu-note">
          <p className="menu-note__heading">{section.note.heading[lang]}</p>
          <ul className="menu-note__options">
            {section.note.options.map((opt, i) => (
              <li key={i}>{opt[lang]}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AllergenLegend({ lang }) {
  return (
    <aside className="legend" aria-label={t.allergensHeading[lang]}>
      <h3 className="legend__title">{t.allergensHeading[lang]}</h3>
      <ul className="legend__list">
        {Object.entries(allergenInfo).map(([code, info]) => (
          <li key={code} className="legend__item">
            <span
              className="allergen-dot"
              style={{ background: info.color }}
              aria-hidden="true"
            >
              {info.short}
            </span>
            <span className="legend__label">{info.label[lang]}</span>
          </li>
        ))}
      </ul>
      <p className="legend__note">{t.allergensNote[lang]}</p>
    </aside>
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
  const showAllergens = tab === 'food';

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
            <MenuSection
              key={section.id}
              section={section}
              lang={lang}
              showAllergens={showAllergens}
            />
          ))}
        </div>

        {showAllergens && <AllergenLegend lang={lang} />}
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
