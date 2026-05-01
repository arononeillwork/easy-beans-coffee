import Hero from './business/Hero.jsx';
import WhatWeAre from './business/WhatWeAre.jsx';
import Location from './business/Location.jsx';
import JoinUs from './business/JoinUs.jsx';
import Footer from './business/Footer.jsx';
import Menu from './business/Menu.jsx';

function getRoute() {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.replace(/\/+$/, '');
  return path === '/menu' ? 'menu' : 'home';
}

export default function App() {
  if (getRoute() === 'menu') {
    return <Menu />;
  }

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
