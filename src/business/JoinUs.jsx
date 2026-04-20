import './JoinUs.css';

const HIRING_EMAIL = 'easybeanscafe@gmail.com';
const MAILTO = `mailto:${HIRING_EMAIL}?subject=${encodeURIComponent('Job Application')}`;

const ROLES = ['Barista'];

export default function JoinUs() {
  return (
    <section id="join" className="join">
      <div className="container join__inner">
        <p className="join__eyebrow">We're hiring</p>
        <h2 className="join__headline">Join us.</h2>
        <p className="join__body">
          Building a team that cares about good coffee, real ingredients, and
          the people on the other side of the counter. If that sounds like you,
          we'd love to hear from you.
        </p>

        <ul className="join__roles" aria-label="Open role types">
          {ROLES.map((role) => (
            <li key={role} className="join__role">{role}</li>
          ))}
        </ul>

        <a
          className="join__cta"
          href="https://go.jobtoday.com/HNsNjLn0s2b"
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply for a role
        </a>
        <p className="join__email">
          or email <a href={MAILTO}>{HIRING_EMAIL}</a>
        </p>
      </div>
    </section>
  );
}
