import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateNiche, cartTotals, toFreeShipping, commissionBySeller, platformNet, sellerPayout,
  normalizeArabic, searchTerms, matches, normalizeEgyptPhone, maskPhone,
  type NicheConfig, type OrderMoney,
} from '../src/index.ts';

const load = (id: string) => JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'niches', `${id}.json`), 'utf8')) as NicheConfig;
const umrah = load('umrah');

test('the niche config is valid', () => {
  assert.deepEqual(validateNiche(umrah), []);
});

test('validation rejects commission that makes poaching profitable', () => {
  const bad = { ...umrah, commission: { new: 0.05, repeat: 0.18, referral: 0.02 } };
  assert.ok(validateNiche(bad).some((p) => p.includes('new >= repeat')));
});

test('Umrah kit cart: bundle discount, shipping, deposit above 1,200', () => {
  const t = cartTotals({
    lines: [
      { sellerId: 'sara', unitPrice: 850, qty: 1 },
      { sellerId: 'huda', unitPrice: 380, qty: 1 },
      { sellerId: 'tarha', unitPrice: 180, qty: 2 },
    ],
    bundleDiscount: 100, walletBalance: 0, useWallet: false, isFirstOrder: false,
  }, umrah);
  assert.equal(t.subtotal, 1590);
  assert.equal(t.total, 1590 - 100 + 65);
  assert.equal(t.depositRequired, true);
  assert.equal(t.deposit, 65);
});

test('10% first-order promo applies once, after bundle discount', () => {
  const promo = umrah.promos[0];
  const base = { lines: [{ sellerId: 'sara', unitPrice: 850, qty: 1 }], bundleDiscount: 0, walletBalance: 0, useWallet: false, promo };
  const first = cartTotals({ ...base, isFirstOrder: true }, umrah);
  assert.equal(first.promoDiscount, 85);
  assert.equal(first.total, 850 - 85 + 65);
  const second = cartTotals({ ...base, isFirstOrder: false }, umrah);
  assert.equal(second.promoDiscount, 0);
  assert.equal(second.promoRejected, 'first_order_only');
});

test('wallet never pays for shipping', () => {
  const t = cartTotals({ lines: [{ sellerId: 's', unitPrice: 100, qty: 1 }], bundleDiscount: 0, walletBalance: 500, useWallet: true, isFirstOrder: false }, umrah);
  assert.equal(t.wallet, 100);
  assert.equal(t.total, 65);
});

test('commission tiers: new 18%, repeat 6%, seller code 2%', () => {
  const lines = [{ sellerId: 'sara', unitPrice: 1000, qty: 1 }];
  const o = (type: OrderMoney['type']): OrderMoney => ({ type, lines, platformDiscount: 0, wallet: 0, delivered: false });
  assert.equal(commissionBySeller(o('new'), umrah).sara, 180);
  assert.equal(commissionBySeller(o('repeat'), umrah).sara, 60);
  assert.equal(commissionBySeller(o('referral'), umrah).sara, 20);
});

test('seller-funded discount lowers the commission base, platform-funded does not', () => {
  const lines = [{ sellerId: 'sara', unitPrice: 1000, qty: 1 }];
  const seller: OrderMoney = { type: 'new', lines, platformDiscount: 0, sellerDiscount: { sara: 100 }, wallet: 0, delivered: false };
  const platform: OrderMoney = { type: 'new', lines, platformDiscount: 100, wallet: 0, delivered: false };
  assert.equal(commissionBySeller(seller, umrah).sara, 162);
  assert.equal(commissionBySeller(platform, umrah).sara, 180);
  assert.equal(platformNet(platform, umrah), 80);
});

test('platform net subtracts cashback after delivery', () => {
  const o: OrderMoney = { type: 'new', lines: [{ sellerId: 'sara', unitPrice: 1000, qty: 1 }], platformDiscount: 0, wallet: 0, delivered: true };
  assert.equal(platformNet(o, umrah), 180 - 40);
});

test('weekly payout: commission, 12% reserve, payable', () => {
  const orders: OrderMoney[] = [
    { type: 'new', lines: [{ sellerId: 'sara', unitPrice: 850, qty: 1 }, { sellerId: 'huda', unitPrice: 380, qty: 1 }], platformDiscount: 100, wallet: 0, delivered: true },
    { type: 'repeat', lines: [{ sellerId: 'sara', unitPrice: 1150, qty: 1 }], platformDiscount: 0, wallet: 0, delivered: true },
  ];
  const p = sellerPayout('sara', orders, umrah);
  assert.equal(p.sales, 2000);
  assert.equal(p.commission, 153 + 69);
  assert.equal(p.net, 1778);
  assert.equal(p.reserve, 213.36);
  assert.equal(p.payable, 1564.64);
});

test('Arabic search normalizes letters and maps synonyms', () => {
  assert.equal(normalizeArabic('عبايةٌ إحرام'), 'عبايه احرام');
  const terms = searchTerms('اسدال', umrah.searchSynonyms);
  assert.deepEqual(terms, ['عبايه']);
  assert.ok(matches('عباية عمرة كريب — بيج', terms));
  assert.ok(!matches('طرحة شيفون', searchTerms('نقاب', umrah.searchSynonyms)));
});

test('Egyptian phone numbers', () => {
  assert.equal(normalizeEgyptPhone('+20 101 234 5678'), '01012345678');
  assert.equal(normalizeEgyptPhone('٠١١٢٣٤٥٦٧٨٩'), '01123456789');
  assert.equal(normalizeEgyptPhone('0123'), null);
  assert.equal(normalizeEgyptPhone('01312345678'), null);
  assert.equal(maskPhone('01012344471'), '010••••4471');
});

test('free shipping: goods at or over the line ship free and the platform pays the fee', () => {
  const coffee = load('coffee');
  const line = (unitPrice: number, qty = 1) => ({ sellerId: 'bonds', unitPrice, qty });
  const base = { bundleDiscount: 0, walletBalance: 0, useWallet: false, isFirstOrder: true };
  const under = cartTotals({ ...base, lines: [line(1499)] }, coffee);
  assert.equal(under.shipping, coffee.shippingEgp);
  assert.equal(under.shippingWaived, 0);
  assert.equal(toFreeShipping(1499, coffee), 1);
  const at = cartTotals({ ...base, lines: [line(750, 2)] }, coffee);
  assert.equal(at.shipping, 0);
  assert.equal(at.shippingWaived, coffee.shippingEgp);
  assert.equal(at.total, 1500);
  assert.equal(toFreeShipping(1500, coffee), null);
  // Bundle discounts count: 1,540 of goods with a 60 bundle discount is under the line.
  const bundle = cartTotals({ ...base, lines: [line(1540)], bundleDiscount: 60 }, coffee);
  assert.equal(bundle.shipping, coffee.shippingEgp);
  // A niche without a line always charges shipping.
  const umrah = load('umrah');
  assert.equal(cartTotals({ ...base, lines: [line(5000)] }, umrah).shippingWaived, 0);
  assert.equal(toFreeShipping(10, umrah), null);
  // The waived fee is a platform cost in the net.
  const net = platformNet({ type: 'new', lines: [{ sellerId: 'bonds', unitPrice: 1500, qty: 1, unitCost: 1200 }], platformDiscount: at.shippingWaived, wallet: 0, delivered: false }, coffee);
  assert.equal(net, 300 - coffee.shippingEgp);
});
