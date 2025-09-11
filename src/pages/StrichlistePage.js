// src/pages/StrichlistePage.js
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { fetchProducts, fetchNames, saveOrder, savePayment, fetchEntries, fetchPayments } from '../api';
import '../styles.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function StrichlistePage() {
  const [products, setProducts]     = useState([]);
  const [names, setNames]           = useState([]);
  const [selectedName, setName]     = useState(null);
  const [quantities, setQty]        = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentCents, setPaymentCents] = useState(0);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [entries, setEntries]       = useState([]);
  const [payments, setPayments]     = useState([]);

  const loadData = () => {
    fetchNames()
      .then(raw => {
        const sorted = raw.sort((a,b) => a.localeCompare(b, 'de'));
        setNames(sorted.map(n => ({ value: n, label: n })));
      })
      .catch(console.error);
    fetchProducts().then(setProducts).catch(console.error);
    fetchEntries().then(setEntries).catch(console.error);
    fetchPayments().then(setPayments).catch(console.error);
    setQty({});
    setName(null);
  };
  useEffect(loadData, []);

  const adjustQty = (titel, delta) => {
    setQty(q => {
      const newVal = Math.max(0, (q[titel]||0) + delta);
      return { ...q, [titel]: newVal };
    });
  };

  const total = products.reduce(
    (sum, p) => sum + (quantities[p.titel] || 0) * p.preis,
    0
  );

  const handleSubmit = async () => {
    if (!selectedName) return toast.error('Bitte Name wählen');
    const items = products
      .filter(p => (quantities[p.titel] || 0) > 0)
      .map(p => ({
          titel: p.titel,
          preis: p.preis,
          menge: quantities[p.titel]
        }));
    if (!items.length) return toast.error('Mindestens ein Produkt wählen');

    setSubmitting(true);
    try {
      await saveOrder({ name: selectedName.value, items });
      toast.success('Verzehr gespeichert!');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = () => {
    if (!selectedName) {
      return toast.error('Zunächst einen Namen auswählen');
    }
    setShowPayModal(true);
  };

  const handleAmountKeyDown = e => {
    e.preventDefault();
    const key = e.key;

    if (key >= '0' && key <= '9') {
      setPaymentCents(c => {
        const next = c * 10 + Number(key);
        return next > 99999 ? c : next;
      });
    } else if (key === 'Backspace' || key === 'Delete') {
      setPaymentCents(c => Math.floor(c / 10));
    } else if (key === 'Enter') {
      handlePaymentSubmit();
    }
  };

  const handlePaymentSubmit = async () => {
    const amt = paymentCents / 100;
    if (!selectedName) {
      return toast.error('Zunächst einen Namen auswählen');
    }
    if (amt <= 0) {
      return toast.error('Bitte einen Betrag eingeben');
    }

    setSubmittingPayment(true);
    try {
      await savePayment({
        name:   selectedName.value,
        amount: amt
      });
      toast.success('Zahlung gespeichert!');
      setShowPayModal(false);
      setPaymentCents(0);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Speichern der Zahlung');
    }
    finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h2>Stricherlliste</h2>
        <button className="refresh-btn" onClick={loadData} title="Neu laden">
          ⟳
        </button>
      </header>

      <main>
        <div className="toolbar">
          <label className="name-label">Name:</label>
          <div className="name-select">
            <Select
              options={names}
              value={selectedName}
              onChange={setName}
              isSearchable
              isClearable
              placeholder="– Bitte wählen –"
              isDisabled={submitting || !names.length}
            />
          </div>
          <button
            className="pay-btn"
            onClick={handlePay}
            disabled={submitting}
          >
            Bezahlen
          </button>
        </div>

        <div className="grid">
          {products.map(p => {
            const q = quantities[p.titel] || 0;
            return (
              <div className="card" key={p.titel}>
                <div className="icon-wrap">
                  <img src={p.bildUrl} alt={p.titel} />
                </div>
                <div className="title">{p.titel}</div>
                <div className="price">{p.preis.toFixed(2)} €</div>
                <div className="qty-control">
                  <button
                    className="qty-btn"
                    onClick={() => adjustQty(p.titel, -1)}
                    disabled={submitting || q === 0}
                  >‹</button>
                  <span className="qty-value">{q}</span>
                  <button
                    className="qty-btn"
                    onClick={() => adjustQty(p.titel, +1)}
                    disabled={submitting}
                  >›</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer>
        <div className="summary">Summe: {total.toFixed(2)} €</div>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'speichern…' : 'Übermitteln'}
        </button>
      </footer>

      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => {
                setShowPayModal(false);
                setPaymentCents(0);
              }}
              disabled={submittingPayment}
            >×</button>
            <h3 className="modal-title">Bezahlung</h3>

            <input
              // type="text"
              type="tel"
              inputMode="numeric"
              className="modal-input"
              value={`${(paymentCents / 100).toFixed(2)} €`}
              onKeyDown={handleAmountKeyDown}
              // readOnly
            />

            <button
              className="modal-submit-btn"
              onClick={handlePaymentSubmit}
              disabled={submittingPayment}
            >
              {submittingPayment ? 'speichern…' : 'Übermitteln'}
            </button>

            <div className="kpi-container">
              {(() => {
                const name = selectedName.value;
                const filteredEntries  = entries.filter(e => e.name === name);
                const filteredPayments = payments.filter(p => p.name === name);
                const totalEntries  = filteredEntries.reduce((sum, e) => sum + e.preis * e.menge, 0);
                const totalPayments = filteredPayments.reduce((sum, p) => sum + p.betrag, 0);
                const outstanding   = totalEntries - totalPayments;

                return (
                  <>
                    <div className="kpi-item">
                      <div className="kpi-label">Ausgaben</div>
                      <div className="kpi-value">{totalEntries.toFixed(2)} €</div>
                    </div>
                    <div className="kpi-item">
                      <div className="kpi-label">Bezahlt</div>
                      <div className="kpi-value">{totalPayments.toFixed(2)} €</div>
                    </div>
                    <div className="kpi-item kpi-offen">
                      <div className="kpi-label">Offen</div>
                      <div className="kpi-value">
                        {outstanding.toFixed(2)} €
                        {outstanding > 0
                          ? <span className="offen-icon red"> !</span>
                          : <span className="offen-icon green"> ✔</span>}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
}
