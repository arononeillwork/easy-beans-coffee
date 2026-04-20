import './Logo.css';

export default function Logo({ variant = 'dark', size = 'md' }) {
  return (
    <div className={`logo logo--${variant} logo--${size}`}>
      <svg
        className="logo__icon"
        viewBox="0 0 180 260"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round">
          <rect x="92" y="2" width="62" height="18" />
          <rect x="16" y="20" width="148" height="30" />
          <line x1="16" y1="56" x2="164" y2="56" />
          <path d="M 26 58 L 154 58 L 146 214 L 34 214 Z" />
          <rect x="18" y="218" width="144" height="14" />
          <line x1="108" y1="82" x2="140" y2="82" strokeWidth="6" />
          <line x1="146" y1="82" x2="152" y2="82" strokeWidth="6" />
          <ellipse cx="90" cy="132" rx="26" ry="36" />
          <path d="M 90 100 Q 82 132 90 164" />
        </g>
      </svg>

      <div className="logo__text">
        <span className="logo__name">Easy Beans</span>
        <span className="logo__rule">
          <span className="logo__line" aria-hidden="true" />
          <span className="logo__coffee">COFFEE</span>
          <span className="logo__line" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
