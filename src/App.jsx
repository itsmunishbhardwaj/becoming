import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { PAPER, FONT } from "./tokens.js";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";
import Onboard from "./screens/Onboard.jsx";
import QuickCreate from "./screens/QuickCreate.jsx";
import Day from "./screens/Day.jsx";
import Goal from "./screens/Goal.jsx";
import Month from "./screens/Month.jsx";
import Week from "./screens/Week.jsx";
import SignIn from "./screens/SignIn.jsx";
import { getSession, onAuthStateChange } from "./lib/auth.js";

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

    // Pause decorative border-radius breathing (orb-breathe, log-blob) while
    // scrolling — that property paints every frame and competes with scroll
    // compositing on mobile, which is what reads as "choppy". Shape morph
    // resumes the instant scrolling settles; imperceptible either way.
    let idleTimer;
    function onScroll() {
      document.body.classList.add("is-scrolling");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => document.body.classList.remove("is-scrolling"), 150);
    }
    lenis.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(id);
      clearTimeout(idleTimer);
      lenis.off("scroll", onScroll);
      document.body.classList.remove("is-scrolling");
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
  // undefined = loading, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(setSession);
    const { data: { subscription } } = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief loading — no flash

  if (!session) return <SignIn />;

  return (
    <BrowserRouter>
      <ScrollManager />
      <div className="grain" aria-hidden="true" />
      <div className="vellum-mist" aria-hidden="true" />
      <Link
        to="/"
        style={{
          position: "fixed",
          top: 20,
          left: "max(22px, calc(env(safe-area-inset-left) + 16px))",
          zIndex: 200,
          fontFamily: FONT.serif,
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: PAPER.dim,
          textDecoration: "none",
        }}
      >
        Becoming
      </Link>
      <Routes>
        <Route path="/" element={<Year />} />
        <Route path="/goals" element={<Home />} />
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
