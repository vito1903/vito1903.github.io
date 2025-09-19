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
  const [submittingConsumption, setSubmittingConsumption] = useState(false);
  const [submittingPaying, setSubmittingPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentCents, setPaymentCents] = useState(0);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [entries, setEntries]       = useState([]);
  const [payments, setPayments]     = useState([]);

  // Custom item state (price handled in cents like in modal)
  const [customItem, setCustomItem] = useState({ title: '', qty: 0 });
  const [customPriceCents, setCustomPriceCents] = useState(0);

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
    setCustomItem({ title: '', qty: 0 });
    setCustomPriceCents(0);
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

  // --- custom line validation/totals (Preis like modal) ---
  const hasTitle          = customItem.title.trim().length > 0;
  const hasPositivePrice  = customPriceCents > 0;
  const pairComplete      = hasTitle && hasPositivePrice;

  const customQtyRaw      = Math.max(0, parseInt(customItem.qty, 10) || 0);
  const qtyMin            = pairComplete ? 1 : 0;                          // at least 1 when both present
  const customQtyForUI    = Math.max(customQtyRaw, qtyMin);                // what we show
  const customQtyForCalc  = pairComplete ? Math.max(1, customQtyRaw) : 0;  // what we calculate with
  const customAmount      = pairComplete ? (customPriceCents / 100) * customQtyForCalc : 0;

  const totalWithCustom   = total + customAmount;

  const adjustCustomQty = (delta) => {
    setCustomItem(ci => {
      const current = Math.max(0, parseInt(ci.qty, 10) || 0);
      const minNow  = (ci.title.trim().length > 0 && customPriceCents > 0) ? 1 : 0;
      const next    = Math.max(minNow, current + delta);
      return { ...ci, qty: next };
    });
  };

  // Preis input behaves like the payment modal
  const handleCustomPriceKeyDown = (e) => {
    e.preventDefault();
    const key = e.key;
    if (key >= '0' && key <= '9') {
      setCustomPriceCents(c => {
        const next = c * 10 + Number(key);
        return next > 99999 ? c : next; // cap at 999.99 like modal
      });
    } else if (key === 'Backspace' || key === 'Delete') {
      setCustomPriceCents(c => Math.floor(c / 10));
    } else if (key === 'Enter') {
      // no-op here (avoid accidental submit)
    }
  };

  const buildItemsWithCustom = () => {
    const items = products
      .filter(p => (quantities[p.titel] || 0) > 0)
      .map(p => ({
        titel: p.titel,
        preis: p.preis,
        menge: quantities[p.titel]
      }));

    if (hasTitle ^ hasPositivePrice) {
      // one provided without the other
      throw new Error('CUSTOM_PAIR_INCOMPLETE');
    }

    if (pairComplete) {
      items.push({
        titel: customItem.title.trim(),
        preis: customPriceCents / 100,
        menge: customQtyForCalc
      });
    }
    return items;
  };

  const handleSubmit = async () => {
    if (!selectedName) return toast.error('Bitte Name wählen');

    let items;
    try {
      items = buildItemsWithCustom();
    } catch (e) {
      if (e.message === 'CUSTOM_PAIR_INCOMPLETE') {
        return toast.error('Bitte Bezeichnung UND Preis eingeben (beide Pflicht).');
      }
      throw e;
    }
    if (!items.length) return toast.error('Mindestens ein Produkt oder individuellen Posten wählen');

    setSubmittingConsumption(true);
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
      setSubmittingConsumption(false);
    }
  };

  const handleSubmitPaid = async () => {
    if (!selectedName) return toast.error('Bitte Name wählen');

    let items;
    try {
      items = buildItemsWithCustom();
    } catch (e) {
      if (e.message === 'CUSTOM_PAIR_INCOMPLETE') {
        return toast.error('Bitte Bezeichnung UND Preis eingeben (beide Pflicht).');
      }
      throw e;
    }
    if (!items.length) return toast.error('Mindestens ein Produkt oder individuellen Posten wählen');

    const sum = items.reduce((s, i) => s + i.preis * i.menge, 0);

    setSubmittingPaying(true);
    setSubmitting(true);
    try {
      await saveOrder({ name: selectedName.value, items });
      await savePayment({
        name: selectedName.value,
        amount: Math.round(sum * 100) / 100
      });

      toast.success('Verzehr & Zahlung gespeichert!');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Bestellung gespeichert? Zahlung evtl. fehlgeschlagen. Bitte Zahlung ggf. separat nachtragen.');
      loadData();
    } finally {
      setSubmittingPaying(false);
      setSubmitting(false);
    }
  };

  const handlePay = () => {
    if (!selectedName) {
      return toast.error('Zunächst einen Namen auswählen');
    }
    setShowPayModal(true);
  };

  // Existing payment modal keypad behavior
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

          {/* Custom item as the LAST CARD */}
          <div className="card" key="__custom__">
            <div className="icon-wrap" aria-hidden>
              <div
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, userSelect: 'none', background: '#f3f4f6'
                }}
                title="Individueller Posten"
              >
                +
              </div>
            </div>

            <div className="title">
              <input
                className="custom-title-input"
                type="text"
                placeholder="Individueller Posten"
                value={customItem.title}
                onChange={(e) => setCustomItem(ci => ({ ...ci, title: e.target.value }))}
                disabled={submitting}
                aria-label="Bezeichnung"
              />
            </div>

            <div className="price">
              <input
                className="custom-price-input"
                type="tel"
                inputMode="numeric"
                value={`${(customPriceCents / 100).toFixed(2)} €`}
                onKeyDown={handleCustomPriceKeyDown}
                readonly
                // placeholder="0.00 €"
                placeholder="0.00 €"
                disabled={submitting}
                aria-label="Preis"
              />
            </div>

            <div className="qty-control">
              <button
                className="qty-btn"
                onClick={() => adjustCustomQty(-1)}
                disabled={submitting || customQtyForUI <= qtyMin}
              >‹</button>
              <span className="qty-value">{customQtyForUI}</span>
              <button
                className="qty-btn"
                onClick={() => adjustCustomQty(+1)}
                disabled={submitting}
              >›</button>
            </div>

            {pairComplete && (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: 'center' }}>
                {customQtyForCalc} × {customItem.title.trim()} = {(customAmount).toFixed(2)} €
              </div>
            )}
          </div>
        </div>
      </main>

      <footer>
        <div className="summary">Summe: {totalWithCustom.toFixed(2)} €</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="submit-btn"
            onClick={handleSubmitPaid}
            disabled={submittingPaying || submitting}
          >
            {submittingPaying ? 'Speichern…' : 'Sofort bezahlt'}
          </button>
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submittingPaying || submitting}
          >
            {submittingConsumption ? 'Speichern…' : 'Auf die Stricherlliste'}
          </button>
        </div>
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
              type="tel"
              inputMode="numeric"
              className="modal-input"
              value={`${(paymentCents / 100).toFixed(2)} €`}
              onKeyDown={handleAmountKeyDown}
              readonly
            />

            <button
              className="modal-submit-btn"
              onClick={handlePaymentSubmit}
              disabled={submittingPayment}
            >
              {submittingPayment ? 'Speichern…' : 'Übermitteln'}
            </button>

            <div className="kpi-container">
              {(() => {
                const name = selectedName?.value;   // ✅ null-safe
                if (!name) {
                  return (
                    <div className="kpi-item">
                      <div className="kpi-label">Bitte Name wählen</div>
                      <div className="kpi-value">—</div>
                    </div>
                  );
                }

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
