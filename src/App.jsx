import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import Lenis from "lenis";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";
import Onboard from "./screens/Onboard.jsx";
import QuickCreate from "./screens/QuickCreate.jsx";
import Day from "./screens/Day.jsx";
import Goal from "./screens/Goal.jsx";
import Month from "./screens/Month.jsx";
import Week from "./screens/Week.jsx";
import Todo from "./screens/Todo.jsx";
import Journal from "./screens/Journal.jsx";
import Insights from "./screens/Insights.jsx";
import CoachCarter from "./screens/CoachCarter.jsx";
import SignIn from "./screens/SignIn.jsx";
import NavShell from "./components/NavShell.jsx";
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Year />} />
        <Route path="/goals" element={<Home />} />
        <Route path="/year" element={<Year />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/create" element={<QuickCreate />} />
        <Route path="/day/:date" element={<Day />} />
        <Route path="/goal/:id" element={<Goal />} />
        <Route path="/month/:yyyymm" element={<Month />} />
        <Route path="/week/:yyyymmdd" element={<Week />} />
        <Route path="/todo" element={<Todo />} />
        <Route path="/todo/:date" element={<Todo />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/coach-carter" element={<CoachCarter />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    getSession().then(setSession);
    const { data: { subscription } } = onAuthStateChange(setSession);
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  if (!session) return <SignIn />;

  return (
    <BrowserRouter>
      <ScrollManager />
      <div className="grain" aria-hidden="true" />
      <div className="vellum-mist" aria-hidden="true" />
      <NavShell />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
