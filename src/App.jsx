import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";
import Onboard from "./screens/Onboard.jsx";
import QuickCreate from "./screens/QuickCreate.jsx";
import Day from "./screens/Day.jsx";
import Goal from "./screens/Goal.jsx";
import Month from "./screens/Month.jsx";
import Week from "./screens/Week.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="grain" aria-hidden="true" />
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
