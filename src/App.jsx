import Hero from './business/Hero.jsx';
import WhatWeAre from './business/WhatWeAre.jsx';
import Location from './business/Location.jsx';
import JoinUs from './business/JoinUs.jsx';
import Footer from './business/Footer.jsx';

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <WhatWeAre />
        <Location />
        <JoinUs />
      </main>
      <Footer />
    </>
  );
}
