import { lazy, Suspense } from 'react';
import Hero from './business/Hero.jsx';
import WhatWeAre from './business/WhatWeAre.jsx';
import Location from './business/Location.jsx';
import JoinUs from './business/JoinUs.jsx';
import Footer from './business/Footer.jsx';
import Menu from './business/Menu.jsx';

const AdminPage = lazy(() => import('./features/admin/client/AdminPage'));

function getRoute() {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/menu') return 'menu';
  if (path === '/admin') return 'admin';
  return 'home';
}

export default function App() {
  const route = getRoute();

  if (route === 'admin') {
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  }

  if (route === 'menu') {
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
