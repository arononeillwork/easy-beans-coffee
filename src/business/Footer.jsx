import Logo from './Logo.jsx';
import './Footer.css';

const INSTAGRAM_URL = 'https://www.instagram.com/easy.beans.coffee/';
const EMAIL = 'easybeanscafe@gmail.com';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo variant="light" size="sm" />

        <p className="footer__cta">Follow us for updates.</p>

        <ul className="footer__links">
          <li>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              @easy.beans.coffee
            </a>
          </li>
          <li>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </li>
        </ul>

        <p className="footer__meta">
          © {year} Easy Beans Coffee · San Pedro de Alcántara
        </p>
      </div>
    </footer>
  );
}
