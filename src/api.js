import { fetchNames as fetchNamesCsv, fetchProducts as fetchProductsCsv, fetchEntries as fetchEntriesCsv, fetchPayments as fetchPaymentsCsv } from './utils/sheet';

const BASE = process.env.REACT_APP_GOOGLE_SHEET_DEPLOYMENT_URL;

export async function fetchProducts() {
  return fetchProductsCsv();
}

export async function fetchNames() {
  return fetchNamesCsv();
}

export async function fetchEntries() {
  return fetchEntriesCsv();
}

export async function fetchPayments() {
  return fetchPaymentsCsv();
}

export async function saveOrder(order) {
  const res = await fetch(BASE, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveOrder', ...order }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  // console.log('⟵ Got response:', res);
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function savePayment(payment) {
  const res = await fetch(BASE, {
    method: 'POST',
    body: JSON.stringify({ action: 'savePayment', ...payment }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  // console.log('⟵ Got response:', res);
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save failed: ${res.status} ${text}`);
  }
  return res.json();
}