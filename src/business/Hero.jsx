import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" aria-label="Easy Beans Coffee — Coming Soon">
      <div className="hero__bg" />
      <div className="hero__tint" aria-hidden="true" />
      <div className="hero__curtain hero__curtain--left" aria-hidden="true" />
      <div className="hero__curtain hero__curtain--right" aria-hidden="true" />
      <div className="hero__vignette" aria-hidden="true" />
      <div className="hero__grain" aria-hidden="true" />

      <div className="hero__inner">
        <div className="hero__reveal">
          <span className="hero__rule" aria-hidden="true" />
          <h1 className="hero__coming">Coming&nbsp;Soon</h1>
          <span className="hero__rule" aria-hidden="true" />
        </div>

        <p className="hero__tagline">
          Coffee, matcha, and good energy.
        </p>
        <p className="hero__meta">
          San Pedro de Alcántara · April 2026
        </p>
      </div>
    </section>
  );
}
