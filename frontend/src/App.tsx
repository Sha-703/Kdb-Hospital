import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import Actes from './pages/Actes';
import PatientDetail from './pages/PatientDetail';
import AppointmentDetail from './pages/AppointmentDetail';
import Staff from './pages/Staff';
import Billing from './pages/Billing';
import BillingPayment from './pages/BillingPayment';
import Inventory from './pages/Inventory';
import './styles.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Header />
        <main className="app-main">
          <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/actes" element={<Actes />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/:id/pay" element={<BillingPayment />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
