import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import DeploymentAnalysis from "./pages/DeploymentAnalysis";
import Monitoring from "./pages/Monitoring";
import Assessment from "./pages/Assessment";
import Report from "./pages/Report";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analysis" element={<DeploymentAnalysis />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/assessment" element={<Assessment />} />
        <Route path="/report" element={<Report />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;