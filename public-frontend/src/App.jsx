import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ToastProvider } from './context/ToastContext';
import { DialogProvider } from './context/DialogContext';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Industries from './pages/Industries';
import Branches from './pages/Branches';
import Contact from './pages/Contact';
import GetQuote from './pages/GetQuote';
import TrackShipment from './pages/TrackShipment';
import FAQ from './pages/FAQ';
import Careers from './pages/Careers';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  return (
    <DialogProvider>
      <ToastProvider>
        <ScrollToTop />
        <Navbar />
        <main style={{ minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/quote" element={<GetQuote />} />
            <Route path="/track" element={<TrackShipment />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </ToastProvider>
    </DialogProvider>
  );
}

export default App;
