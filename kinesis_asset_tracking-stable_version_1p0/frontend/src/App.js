import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Assets from './pages/Assets';
import RTLS from './pages/RTLS';
import FloorPlanEdit from './pages/FloorPlanEdit';
import Calibration from './pages/Calibration';
import OTStatus from './pages/OTStatus';
import PatientTagAssignment from './pages/PatientTagAssignment';
import EnvironmentTelemetry from './pages/EnvironmentTelemetry';
import AssetTracking from './pages/AssetTracking';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/rtls" element={<RTLS />} />
          <Route path="/calibration" element={<Calibration />} />
          <Route path="/ot-status" element={<OTStatus />} />
          <Route path="/patient-tags" element={<PatientTagAssignment />} />
          <Route path="/floor-plan" element={<FloorPlanEdit />} />
          <Route path="/humidity" element={<EnvironmentTelemetry />} />
          <Route path="/asset-tracking" element={<AssetTracking />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
