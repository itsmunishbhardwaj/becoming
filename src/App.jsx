import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";
import Onboard from "./screens/Onboard.jsx";
import QuickCreate from "./screens/QuickCreate.jsx";
import Day from "./screens/Day.jsx";
import Goal from "./screens/Goal.jsx";
import Month from "./screens/Month.jsx";
import Week from "./screens/Week.jsx";

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <div className="grain" aria-hidden="true" />
      <div className="vellum-mist" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/year" element={<Year />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/create" element={<QuickCreate />} />
        <Route path="/day/:date" element={<Day />} />
        <Route path="/goal/:id" element={<Goal />} />
        <Route path="/month/:yyyymm" element={<Month />} />
        <Route path="/week/:yyyymmdd" element={<Week />} />
      </Routes>
    </BrowserRouter>
  );
}
