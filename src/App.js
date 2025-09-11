import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StrichlistePage from './pages/StrichlistePage';

export default function App() {
  return (
    <div className="container">
      <header>
        <img
          src='/logo.png'
          alt="Logo"
          className="logo"
        />
        <h1>K.S.H.V. Lodronia</h1>
      </header>
      <main>
        <Routes>
          {/* <Route path="/" element={<Navigate to="/strichliste" replace />} /> */}
          <Route path="/" element={<StrichlistePage />} />
        </Routes>
      </main>
    </div>
  );
}
