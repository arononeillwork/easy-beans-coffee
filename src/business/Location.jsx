import './Location.css';

const MAP_EMBED_URL =
  'https://www.google.com/maps?q=C.+Pizarro+8,+29670+San+Pedro+de+Alc%C3%A1ntara,+M%C3%A1laga&output=embed';

const MAP_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=C.+Pizarro+8,+29670+San+Pedro+de+Alc%C3%A1ntara,+M%C3%A1laga';

export default function Location() {
  return (
    <section id="location" className="location">
      <div className="container location__grid">
        <div className="location__text">
          <p className="location__eyebrow">In the heart of San Pedro</p>
          <h2 className="location__headline">Find us.</h2>
          <address className="location__address">
            C. Pizarro, 8<br />
            29670 San Pedro de Alcántara<br />
            Málaga, Spain
          </address>
          <a
            className="location__directions"
            href={MAP_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions →
          </a>
        </div>

        <div className="location__map">
          <iframe
            title="Easy Beans Coffee location"
            src={MAP_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
