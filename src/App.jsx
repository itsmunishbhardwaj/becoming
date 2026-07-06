import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./screens/Home.jsx";
import Year from "./screens/Year.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/year" element={<Year />} />
      </Routes>
    </BrowserRouter>
  );
}
