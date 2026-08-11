import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";
import Onboard from "./screens/Onboard.jsx";
import Goal from "./screens/Goal.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/year" element={<Year />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/goal/:id" element={<Goal />} />
      </Routes>
    </BrowserRouter>
  );
}
