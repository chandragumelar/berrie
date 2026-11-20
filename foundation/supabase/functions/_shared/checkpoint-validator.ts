// src/domain/cash-count.ts
var text = (x) => typeof x === "string" && !!x.trim() && x.length <= 200;
var reason = (x) => typeof x === "string" && !!x.trim() && x.length <= 500;
function safe(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error("Perhitungan segmen melampaui batas aman");
  return n;
}
function compareCashCount(segment, amount, expected) {
  const difference = safe(BigInt(amount) - BigInt(expected));
  const segmentExpected = safe(BigInt(segment.openingPhysical) + BigInt(expected) - BigInt(segment.openingExpected));
  const segmentDifference = safe(BigInt(amount) - BigInt(segmentExpected));
  return { difference, segmentExpected, segmentDifference };
}
function custodySegments(session, history2) {
  let custodian = session.initialCustodian, physical = session.openingAmount, expected = session.openingAmount, boundary = null;
  const segments = [];
  for (const event2 of history2?.events ?? []) {
    if (event2.action !== "handover" && event2.action !== "close") continue;
    if (event2.amount === null || event2.expected === null) throw new Error("Batas segmen tidak lengkap");
    const segmentExpected = safe(BigInt(physical) + BigInt(event2.expected) - BigInt(expected));
    const difference = safe(BigInt(event2.amount) - BigInt(segmentExpected));
    if (event2.action === "handover" && (!event2.handover || event2.handover.outgoing !== custodian || event2.handover.received !== event2.amount || event2.handover.segmentExpected !== segmentExpected || event2.handover.segmentDifference !== difference)) throw new Error("Segmen serah-terima tidak sesuai");
    segments.push({ custodian, openingPhysical: physical, openingExpected: expected, openingBoundary: boundary, closingPhysical: event2.amount, closingExpected: event2.expected, closingBoundary: event2.boundary, segmentExpected, difference, closingOperationId: event2.operationId });
    physical = event2.amount;
    expected = event2.expected;
    boundary = event2.boundary;
    if (event2.action === "handover") custodian = event2.handover.incoming;
  }
  if (history2?.events.at(-1)?.action !== "close") segments.push({ custodian, openingPhysical: physical, openingExpected: expected, openingBoundary: boundary, closingPhysical: null, closingExpected: null, closingBoundary: null, segmentExpected: null, difference: null, closingOperationId: null });
  else {
    const total = segments.reduce((sum, s) => sum + BigInt(s.difference), 0n), last = history2.events.at(-1);
    if (safe(total) !== last.difference) throw new Error("Selisih segmen tidak merekonsiliasi sesi");
  }
  return segments;
}
function validateCashCountHistory(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) throw new Error("Histori hitungan tidak sah");
  const h = input;
  if (Object.keys(h).sort().join(",") !== "events,sessionId,storeId" || !text(h.sessionId) || !text(h.storeId) || !Array.isArray(h.events) || !h.events.length) throw new Error("Histori hitungan tidak sah");
  for (const e of h.events) {
    const keys = "action,actorId,amount,blockers,boundary,countOperationId,difference,expected,incomplete,occurredAt,operationId,purpose,reason,sessionRevision";
    if (!e || typeof e !== "object" || Object.keys(e).sort().join(",") !== (e.action === "handover" ? keys.replace("incomplete,", "handover,incomplete,") : keys) || !["close", "handover"].includes(e.purpose) || !["save", "revise", "cancel", "close", "handover"].includes(e.action) || e.action === "close" && e.purpose !== "close" || e.action === "handover" && e.purpose !== "handover" || !text(e.actorId) || !text(e.operationId) || !Number.isSafeInteger(e.sessionRevision) || e.sessionRevision < 0 || typeof e.occurredAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(e.occurredAt) || !Number.isFinite(Date.parse(e.occurredAt)) || !Array.isArray(e.boundary) || !Array.isArray(e.blockers) || !Array.isArray(e.incomplete)) throw new Error("Event hitungan tidak sah");
    if (e.boundary.some((b, i) => !b || Object.keys(b).sort().join(",") !== "key,sequence" || typeof b.key !== "string" || !b.key || !Number.isSafeInteger(b.sequence) || b.sequence < 1 || i > 0 && e.boundary[i - 1].key >= b.key)) throw new Error("Batas hitungan tidak sah");
    if (e.blockers.length || e.incomplete.length || e.reason !== null && !reason(e.reason)) throw new Error("Bukti hitungan tidak sah");
    if (e.action === "save" || e.action === "revise") {
      if (!Number.isSafeInteger(e.amount) || e.amount < 0 || e.reason !== null || e.countOperationId !== null || e.expected !== null || e.difference !== null) throw new Error("Nilai hitungan tidak sah");
    } else if (e.action === "cancel") {
      if (e.amount !== null || e.purpose === "close" && e.reason !== null || e.countOperationId !== null || e.expected !== null || e.difference !== null) throw new Error("Batal hitungan tidak sah");
    } else if (!Number.isSafeInteger(e.amount) || e.amount < 0 || !Number.isSafeInteger(e.expected) || e.expected < 0 || !Number.isSafeInteger(e.difference) || BigInt(e.difference) !== BigInt(e.amount) - BigInt(e.expected) || !text(e.countOperationId) || e.action === "close" && e.difference !== 0 && e.reason === null) throw new Error("Snapshot penutupan tidak sah");
    if (e.action === "handover") {
      const x = e.handover;
      if (!x || Object.keys(x).sort().join(",") !== "incoming,outgoing,received,segmentDifference,segmentExpected,withoutOutgoingReason" || !text(x.outgoing) || !text(x.incoming) || x.incoming === x.outgoing || !Number.isSafeInteger(x.received) || x.received !== e.amount || !Number.isSafeInteger(x.segmentExpected) || !Number.isSafeInteger(x.segmentDifference) || BigInt(x.segmentDifference) !== BigInt(x.received) - BigInt(x.segmentExpected) || x.segmentDifference !== 0 && e.reason === null || x.withoutOutgoingReason !== null && !reason(x.withoutOutgoingReason)) throw new Error("Bukti serah-terima tidak sah");
    }
  }
}

// src/domain/simple-catalog.ts
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var plain = (v, keys) => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).sort().join(",") === [...keys].sort().join(",");
function validateSimpleCatalog(value) {
  if (!plain(value, ["storeId", "categories", "menus"])) throw new Error("Katalog tidak sah");
  const c = value;
  if (typeof c.storeId !== "string" || !c.storeId.trim() || !Array.isArray(c.categories) || !Array.isArray(c.menus)) throw new Error("Katalog tidak sah");
  const ids2 = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Set(), codes = /* @__PURE__ */ new Set();
  for (const x of c.categories) {
    if (!plain(x, ["id", "name"]) || !uuid.test(x.id) || typeof x.name !== "string" || x.name !== x.name.trim() || x.name.length < 1 || x.name.length > 40 || ids2.has(x.id) || names.has(x.name.toLocaleLowerCase("id-ID"))) throw new Error("Kategori tidak sah");
    ids2.add(x.id);
    names.add(x.name.toLocaleLowerCase("id-ID"));
  }
  for (const x of c.menus) {
    if (!plain(x, ["id", "skuId", "stockGroupId", "name", "categoryId", "code", "typeLabel", "price", "active"]) || ![x.id, x.skuId, x.stockGroupId].every((i) => uuid.test(i)) || ids2.has(x.id) || ids2.has(x.skuId) || ids2.has(x.stockGroupId) || !ids2.has(x.categoryId) || typeof x.name !== "string" || x.name !== x.name.trim() || x.name.length < 1 || x.name.length > 80 || typeof x.code !== "string" || !/^N-\d{3,}$/.test(x.code) || x.code.length > 40 || codes.has(x.code) || x.typeLabel !== "Normal" || x.active !== true || !Number.isSafeInteger(x.price) || x.price < 0 || x.price > 999999999) throw new Error("Menu tidak sah");
    ids2.add(x.id);
    ids2.add(x.skuId);
    ids2.add(x.stockGroupId);
    codes.add(x.code);
  }
}
function nextSimpleCode(c) {
  const n = c.menus.reduce((max, m) => Math.max(max, Number(m.code.slice(2))), 0) + 1;
  if (!Number.isSafeInteger(n)) throw new Error("Kode menu habis");
  const code = `N-${String(n).padStart(3, "0")}`;
  if (code.length > 40) throw new Error("Kode menu habis");
  return code;
}

// src/domain/money.ts
function integer(value, min = 0, max = 999999999) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Nilai bilangan bulat di luar batas");
  return value;
}
var safe2 = (n) => {
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < 0n) throw new Error("Total di luar batas");
  return Number(n);
};
function halfUp(n, d) {
  if (n < 0n || d <= 0n) throw new Error("Pembulatan tidak sah");
  return safe2((2n * n + d) / (2n * d));
}
function allocate(total, weights) {
  integer(total, 0, Number.MAX_SAFE_INTEGER);
  if (new Set(weights.map((x) => x.id)).size !== weights.length || weights.some((x) => !x.id)) throw new Error("ID unit tidak sah");
  const sum = weights.reduce((n, x) => n + BigInt(integer(x.weight, 0, Number.MAX_SAFE_INTEGER)), 0n);
  if (sum === 0n) {
    if (total !== 0) throw new Error("Tidak dapat mengalokasikan nilai");
    return new Map(weights.map((x) => [x.id, 0]));
  }
  const rows = weights.map((x) => {
    const n = BigInt(total) * BigInt(x.weight);
    return { id: x.id, value: safe2(n / sum), remainder: n % sum };
  });
  let remaining = total - rows.reduce((n, x) => n + x.value, 0);
  rows.sort((a, b) => a.remainder === b.remainder ? a.id < b.id ? -1 : a.id > b.id ? 1 : 0 : a.remainder > b.remainder ? -1 : 1);
  for (const row2 of rows) {
    if (remaining <= 0) break;
    row2.value++;
    remaining--;
  }
  return new Map(rows.map((x) => [x.id, x.value]));
}
function settlement(units, discount, taxBp, serviceBp) {
  if (!units.length || new Set(units.map((u) => u.id)).size !== units.length || units.some((u) => !u.id)) throw new Error("Unit tidak sah");
  integer(discount);
  integer(taxBp, 0, 1e4);
  integer(serviceBp, 0, 1e4);
  const rows = units.map((u) => {
    integer(u.skuPrice);
    integer(u.toppingPrice);
    integer(u.promo, 0, u.skuPrice);
    return { ...u, gross: safe2(BigInt(u.skuPrice) + BigInt(u.toppingPrice)) };
  });
  const subtotal = safe2(rows.reduce((n, u) => n + BigInt(u.gross), 0n));
  const promo = safe2(rows.reduce((n, u) => n + BigInt(u.promo), 0n));
  if (promo > 0 && discount > 0 || discount > subtotal - promo) throw new Error("Diskon tidak sah");
  const discounts = allocate(discount, rows.map((u) => ({ id: u.id, weight: u.gross })));
  const bases = rows.map((u) => ({ id: u.id, weight: u.gross - u.promo - discounts.get(u.id) }));
  const base = subtotal - promo - discount;
  const tax = halfUp(BigInt(base) * BigInt(taxBp), 10000n), service = halfUp(BigInt(base) * BigInt(serviceBp), 10000n);
  const taxes = allocate(tax, bases), services = allocate(service, bases);
  const allocations = bases.map((u) => ({ id: u.id, discount: discounts.get(u.id), base: u.weight, tax: taxes.get(u.id), service: services.get(u.id), total: safe2(BigInt(u.weight) + BigInt(taxes.get(u.id)) + BigInt(services.get(u.id))) }));
  return { subtotal, promo, discount, base, tax, service, total: safe2(BigInt(base) + BigInt(tax) + BigInt(service)), allocations };
}

// src/domain/settlement.ts
function nonblank(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Identitas wajib");
}
function discountValue(discount, basis) {
  if (discount.kind === "none") return 0;
  if (discount.kind === "amount") return integer(discount.value);
  if (discount.kind === "percent") return halfUp(BigInt(basis) * BigInt(integer(discount.value, 0, 1e4)), 10000n);
  throw new Error("Jenis diskon tidak sah");
}
function validateBuyPromo(promo, identity) {
  integer(promo.buy, 1, 99);
  integer(promo.free, 1, 99);
  nonblank(promo.promotionId);
  object(identity);
  for (const key2 of ["toppings", "choices"]) {
    if (!Array.isArray(identity[key2])) throw new Error("Identitas promo tidak sah");
    for (const item of identity[key2]) nonblank(item);
    if (new Set(identity[key2]).size !== identity[key2].length) throw new Error("Identitas promo ganda");
  }
  if (identity.serving !== "dine_in" && identity.serving !== "takeaway") throw new Error("Penyajian tidak sah");
  if (typeof identity.note !== "string") throw new Error("Catatan tidak sah");
}
function applyQuantityPromos(units) {
  const groups = /* @__PURE__ */ new Map();
  for (const unit of units) {
    if (unit.promo.kind !== "buyXGetY") continue;
    validateBuyPromo(unit.promo, unit.identity);
    const identity = unit.identity;
    const key2 = JSON.stringify([unit.skuId, unit.skuPrice, unit.toppingPrice, unit.promo.promotionId, unit.promo.revision, unit.promo.buy, unit.promo.free, [...identity.toppings].sort(), [...identity.choices].sort(), identity.serving, identity.note]);
    const group = groups.get(key2) ?? [];
    group.push(unit);
    groups.set(key2, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const ids2 = group.map((u) => u.id);
    const promo = group[0].promo;
    if (promo.kind !== "buyXGetY") throw new Error("Promo tidak sah");
    const size = promo.buy + promo.free;
    for (const unit of group) unit.groupUnitIds = [...ids2];
    for (let i = 0; i + size <= group.length; i += size) {
      const members = group.slice(i, i + size);
      const amount = Number(BigInt(group[0].skuPrice) * BigInt(promo.free));
      const shares = allocate(amount, members.map((u) => ({ id: u.id, weight: u.skuPrice })));
      for (const unit of members) unit.promoAmount = shares.get(unit.id);
    }
  }
}
function freezeSettlement(orderId, lines, discount, taxBp, serviceBp, source2) {
  nonblank(orderId);
  if (!Array.isArray(lines) || !lines.length) throw new Error("Unit wajib");
  const units = [];
  for (const line of lines) {
    nonblank(line.skuId);
    integer(line.skuPrice);
    integer(line.toppingPrice);
    integer(line.promo.revision, 0, Number.MAX_SAFE_INTEGER);
    if (!Array.isArray(line.unitIds)) throw new Error("Unit tidak sah");
    integer(line.unitIds.length, 1, 999);
    if (line.promo.kind === "buyXGetY") validateBuyPromo(line.promo, line.identity);
    const p = line.promo.kind === "none" || line.promo.kind === "buyXGetY" ? 0 : discountValue(line.promo, line.skuPrice);
    if (p > line.skuPrice) throw new Error("Promo melebihi harga SKU");
    for (const id8 of line.unitIds) {
      nonblank(id8);
      units.push({ id: id8, skuId: line.skuId, skuPrice: line.skuPrice, toppingPrice: line.toppingPrice, promo: structuredClone(line.promo), promoAmount: p, ...line.promo.kind === "buyXGetY" ? { identity: structuredClone(line.identity) } : {} });
    }
  }
  applyQuantityPromos(units);
  if (discount.kind !== "none" && units.some((u) => u.promo.kind === "buyXGetY")) throw new Error("Promo tidak dapat digabung diskon order");
  const subtotal = units.reduce((n, u) => n + BigInt(u.skuPrice) + BigInt(u.toppingPrice), 0n);
  if (subtotal > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Total di luar batas");
  const amount = discountValue(discount, Number(subtotal));
  const totals = settlement(units.map((u) => ({ id: u.id, skuPrice: u.skuPrice, toppingPrice: u.toppingPrice, promo: u.promoAmount })), amount, taxBp, serviceBp);
  if (!["free", "payment", "platform"].includes(source2) || (totals.total === 0 ? source2 !== "free" : source2 === "free")) throw new Error("Sumber settlement tidak sah");
  return { orderId, units, discount: structuredClone(discount), taxBp, serviceBp, source: source2, paymentAmount: source2 === "payment" ? totals.total : 0, totals };
}
function object(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Struktur tidak sah");
}
function validateDiscount(value, promo = false) {
  object(value);
  if (promo) integer(value.revision, 0, Number.MAX_SAFE_INTEGER);
  if (value.kind === "none") return;
  if (promo && value.kind === "buyXGetY") {
    integer(value.buy, 1, 99);
    integer(value.free, 1, 99);
    nonblank(value.promotionId);
    return;
  }
  if (value.kind === "amount") {
    integer(value.value);
    return;
  }
  if (value.kind === "percent") {
    integer(value.value, 0, 1e4);
    return;
  }
  throw new Error("Jenis diskon tidak sah");
}
function validateSettlementSnapshot(value) {
  object(value);
  nonblank(value.orderId);
  if (!Array.isArray(value.units) || !value.units.length) throw new Error("Unit wajib");
  validateDiscount(value.discount);
  integer(value.taxBp, 0, 1e4);
  integer(value.serviceBp, 0, 1e4);
  if (value.source !== "payment" && value.source !== "platform" && value.source !== "free") throw new Error("Sumber settlement tidak sah");
  integer(value.paymentAmount, 0, Number.MAX_SAFE_INTEGER);
  const lines = value.units.map((unit) => {
    object(unit);
    nonblank(unit.id);
    nonblank(unit.skuId);
    integer(unit.skuPrice);
    integer(unit.toppingPrice);
    integer(unit.promoAmount);
    validateDiscount(unit.promo, true);
    if (unit.promo.kind === "buyXGetY") validateBuyPromo(unit.promo, unit.identity);
    return { unitIds: [unit.id], skuId: unit.skuId, skuPrice: unit.skuPrice, toppingPrice: unit.toppingPrice, promo: unit.promo, ...unit.promo.kind === "buyXGetY" ? { identity: unit.identity } : {} };
  });
  const expected = freezeSettlement(value.orderId, lines, value.discount, value.taxBp, value.serviceBp, value.source);
  for (let i = 0; i < expected.units.length; i++) {
    if (value.units[i].promoAmount !== expected.units[i].promoAmount || expected.units[i].promo.kind === "buyXGetY" && JSON.stringify(value.units[i].groupUnitIds) !== JSON.stringify(expected.units[i].groupUnitIds)) throw new Error("Promo snapshot tidak sesuai");
  }
  if (value.paymentAmount !== expected.paymentAmount) throw new Error("Payment snapshot tidak sesuai");
  object(value.totals);
  for (const key2 of ["subtotal", "promo", "discount", "base", "tax", "service", "total"]) {
    integer(value.totals[key2], 0, Number.MAX_SAFE_INTEGER);
    if (value.totals[key2] !== expected.totals[key2]) throw new Error("Total snapshot tidak sesuai");
  }
  if (!Array.isArray(value.totals.allocations) || value.totals.allocations.length !== expected.totals.allocations.length) throw new Error("Alokasi snapshot tidak sah");
  const expectedAllocations = new Map(expected.totals.allocations.map((row2) => [row2.id, row2]));
  const seen = /* @__PURE__ */ new Set();
  for (const row2 of value.totals.allocations) {
    object(row2);
    nonblank(row2.id);
    const match = expectedAllocations.get(row2.id);
    if (!match || seen.has(row2.id)) throw new Error("ID alokasi tidak sah");
    seen.add(row2.id);
    for (const key2 of ["discount", "base", "tax", "service", "total"]) {
      integer(row2[key2], 0, Number.MAX_SAFE_INTEGER);
      if (row2[key2] !== match[key2]) throw new Error("Alokasi snapshot tidak sesuai");
    }
  }
}
function validateRefundHistory(snapshot, history2) {
  validateSettlementSnapshot(snapshot);
  if (!Array.isArray(history2)) throw new Error("Histori refund tidak sah");
  const allocations = new Map(snapshot.totals.allocations.map((a) => [a.id, a.total]));
  const used = /* @__PURE__ */ new Set();
  let total = 0;
  for (const record2 of history2) {
    object(record2);
    if (snapshot.source === "free" || record2.source !== snapshot.source || !Array.isArray(record2.unitIds) || !record2.unitIds.length) throw new Error("Histori refund tidak sah");
    integer(record2.amount, 1, Number.MAX_SAFE_INTEGER);
    let expected = 0;
    for (const id8 of record2.unitIds) {
      nonblank(id8);
      const amount = allocations.get(id8);
      if (amount === void 0 || amount === 0 || used.has(id8)) throw new Error("Unit refund tidak tersedia");
      used.add(id8);
      expected += amount;
    }
    if (!Number.isSafeInteger(expected) || record2.amount !== expected) throw new Error("Nilai refund tidak sesuai snapshot");
    total += expected;
    if (!Number.isSafeInteger(total) || total > snapshot.totals.total) throw new Error("Refund melebihi settlement");
  }
}
function refund(snapshot, previous, unitIds) {
  validateSettlementSnapshot(snapshot);
  validateRefundHistory(snapshot, previous);
  if (snapshot.source === "free") throw new Error("Settlement gratis tidak memiliki refund moneter");
  if (!Array.isArray(unitIds) || !unitIds.length || new Set(unitIds).size !== unitIds.length) throw new Error("Unit refund tidak sah");
  const allocations = new Map(snapshot.totals.allocations.map((a) => [a.id, a.total]));
  const used = new Set(previous.flatMap((record2) => record2.unitIds));
  let amount = 0;
  for (const id8 of unitIds) {
    nonblank(id8);
    const value = allocations.get(id8);
    if (value === void 0 || value === 0 || used.has(id8)) throw new Error("Unit tidak tersedia untuk refund");
    amount += value;
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Refund moneter harus lebih dari nol");
  return { unitIds: [...unitIds], amount, source: snapshot.source };
}

// src/domain/draft.ts
function obj(v) {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) throw new Error("Draft tidak sah");
}
function str(v, max, required = false) {
  if (typeof v !== "string" || v.length > max || required && !v.trim()) throw new Error("Teks draft tidak sah");
}
function uuid2(v) {
  if (typeof v !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) throw new Error("UUID tidak sah");
}
function ids(v) {
  if (!Array.isArray(v)) throw new Error("Unit tidak sah");
  for (const x of v) uuid2(x);
  if (new Set(v).size !== v.length) throw new Error("Unit duplikat");
}
function serving(v) {
  if (v !== "dine_in" && v !== "takeaway") throw new Error("Penyajian tidak sah");
}
function validateDiscount2(v) {
  obj(v);
  if (v.kind === "none") return;
  if (v.kind === "amount") {
    integer(v.value);
    return;
  }
  if (v.kind === "percent") {
    integer(v.value, 0, 1e4);
    return;
  }
  throw new Error("Diskon tidak sah");
}
function validatePromo(v) {
  obj(v);
  integer(v.revision, 0, Number.MAX_SAFE_INTEGER);
  if (v.kind === "none") return;
  if (v.kind === "amount") {
    integer(v.value);
    return;
  }
  if (v.kind === "percent") {
    integer(v.value, 0, 1e4);
    return;
  }
  if (v.kind === "buyXGetY") {
    integer(v.buy, 1, 99);
    integer(v.free, 1, 99);
    str(v.promotionId, 200, true);
    return;
  }
  throw new Error("Promo tidak sah");
}
function selections(v, topping) {
  if (!Array.isArray(v)) throw new Error("Pilihan tidak sah");
  const seen = /* @__PURE__ */ new Set();
  let total = 0;
  for (const entry of v) {
    obj(entry);
    uuid2(entry.id);
    str(entry.name, 80, true);
    if (seen.has(entry.id)) throw new Error("Pilihan duplikat");
    seen.add(entry.id);
    if (topping) {
      total += integer(entry.price);
      integer(total);
    }
  }
  return { ids: [...seen], price: total };
}
function validateDraft(v) {
  obj(v);
  uuid2(v.orderId);
  str(v.displayNumber, 200, true);
  uuid2(v.cashSessionId);
  if (!/^\d{6}-E[1-9]\d*-\d{4,}$/.test(v.displayNumber)) throw new Error("Nomor pesanan tidak sah");
  str(v.customer, 80, true);
  str(v.note, 500);
  str(v.channelAccountId, 200);
  str(v.externalOrderId, 200);
  str(v.savedAt, 40, true);
  if (v.sourceOrderId !== void 0) uuid2(v.sourceOrderId);
  if (Number.isNaN(Date.parse(v.savedAt))) throw new Error("Waktu draft tidak sah");
  if (v.channel !== "store" && v.channel !== "gofood" && v.channel !== "grabfood" && v.channel !== "shopeefood") throw new Error("Channel tidak sah");
  if (v.channel !== "store") {
    uuid2(v.channelAccountId);
    if (!v.externalOrderId.trim() || v.externalOrderId !== v.externalOrderId.trim()) throw new Error("Identitas platform wajib");
  }
  serving(v.serving);
  validateDiscount2(v.discount);
  const taxBp = integer(v.taxBp, 0, 1e4), serviceBp = integer(v.serviceBp, 0, 1e4);
  if (!Array.isArray(v.items) || !v.items.length) throw new Error("Item wajib");
  const lines = [], itemIds = /* @__PURE__ */ new Set(), units = /* @__PURE__ */ new Set();
  for (const item of v.items) {
    obj(item);
    uuid2(item.id);
    uuid2(item.skuId);
    str(item.name, 80, true);
    str(item.note, 200);
    const skuPrice = integer(item.skuPrice), toppingPrice = integer(item.toppingPrice);
    validatePromo(item.promo);
    const choices = selections(item.choices, false), toppings = selections(item.toppings, true);
    if (toppingPrice !== toppings.price) throw new Error("Harga topping tidak sesuai");
    serving(item.serving);
    ids(item.unitIds);
    integer(item.unitIds.length, 1, 999);
    if (itemIds.has(item.id)) throw new Error("Item duplikat");
    itemIds.add(item.id);
    for (const id8 of item.unitIds) {
      if (units.has(id8)) throw new Error("Unit duplikat");
      units.add(id8);
    }
    lines.push({ unitIds: item.unitIds, skuId: item.skuId, skuPrice, toppingPrice, promo: item.promo, identity: { choices: choices.ids, toppings: toppings.ids, serving: item.serving, note: item.note } });
  }
  quote(v.orderId, lines, v.discount, taxBp, serviceBp);
}
function quote(orderId, lines, discount, taxBp, serviceBp) {
  try {
    return freezeSettlement(orderId, lines, discount, taxBp, serviceBp, "free").totals;
  } catch {
    return freezeSettlement(orderId, lines, discount, taxBp, serviceBp, "platform").totals;
  }
}
function draftDateCode(time, zone) {
  if (typeof time !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(time) || Number.isNaN(Date.parse(time))) throw new Error("Waktu pencatatan tidak sah");
  const normalized2 = time.includes(".") ? time : time.replace("Z", ".000Z");
  if (new Date(time).toISOString() !== normalized2) throw new Error("Waktu pencatatan tidak sah");
  if (typeof zone !== "string" || !zone) throw new Error("Zona toko wajib");
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(new Date(time));
  } catch {
    throw new Error("Zona toko tidak sah");
  }
  return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k)?.value ?? "").join("");
}

// src/domain/draft-cancellation.ts
function validateDraftCancellation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Pembatalan draft tidak sah");
  const v = value;
  if (Object.keys(v).sort().join(",") !== "actorId,draftRevision,operationId,orderId,policyVersion,reason,recordedAt" || ![v.orderId, v.operationId, v.actorId].every((x) => typeof x === "string" && !!x.trim() && x.length <= 200) || typeof v.reason !== "string" || !v.reason.trim() || v.reason.length > 500 || !Number.isSafeInteger(v.draftRevision) || v.draftRevision < 0 || !Number.isSafeInteger(v.policyVersion) || v.policyVersion < 1 || typeof v.recordedAt !== "string") throw new Error("Pembatalan draft tidak sah");
  draftDateCode(v.recordedAt, "UTC");
}

// src/domain/unpaid-cancellation.ts
var id = (v) => typeof v === "string" && !!v.trim() && v.length <= 200;
var reason2 = (v) => typeof v === "string" && !!v.trim() && v.length <= 500;
var plain2 = (v) => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function validateUnpaidCancellation(value) {
  if (!plain2(value) || Object.keys(value).sort().join(",") !== "actorId,cashSessionId,id,kitchenConfirmed,orderId,reason,recordedAt,storeId,unitIds" || ![value.id, value.orderId, value.storeId, value.cashSessionId, value.actorId].every(id) || !reason2(value.reason) || value.kitchenConfirmed !== true || typeof value.recordedAt !== "string" || !Array.isArray(value.unitIds) || !value.unitIds.length || !value.unitIds.every(id) || new Set(value.unitIds).size !== value.unitIds.length) throw new Error("Pembatalan unpaid tidak sah");
  draftDateCode(value.recordedAt, "UTC");
}
function validateUnpaidReturn(value) {
  if (!plain2(value) || Object.keys(value).sort().join(",") !== "actorId,cancellationId,cashSessionId,id,orderId,reason,recordedAt,sellable,storeId,units" || ![value.id, value.cancellationId, value.orderId, value.storeId, value.cashSessionId, value.actorId].every(id) || !reason2(value.reason) || value.sellable !== true || typeof value.recordedAt !== "string" || !Array.isArray(value.units) || !value.units.length) throw new Error("Return unpaid tidak sah");
  draftDateCode(value.recordedAt, "UTC");
  const seen = /* @__PURE__ */ new Set();
  for (const unit of value.units) {
    if (!plain2(unit) || Object.keys(unit).sort().join(",") !== "groupId,id" || !id(unit.id) || !id(unit.groupId) || seen.has(unit.id)) throw new Error("Unit return tidak sah");
    seen.add(unit.id);
  }
}

// src/domain/stock.ts
function object2(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Input stok tidak sah");
  return value;
}
function id2(value) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error("Identitas stok tidak sah");
  return value;
}
function integer2(value, min, max) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Angka stok tidak sah");
  return value;
}
var compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function planStockDebits(input) {
  const data2 = object2(input);
  if (!Array.isArray(data2.rows) || !Array.isArray(data2.balances)) throw new Error("Daftar stok tidak sah");
  const balances = /* @__PURE__ */ new Map();
  for (const value of data2.balances) {
    const item = object2(value);
    const groupId = id2(item.groupId);
    if (balances.has(groupId)) throw new Error("Grup stok duplikat");
    balances.set(groupId, integer2(item.balance, 0, Number.MAX_SAFE_INTEGER));
  }
  const rows = /* @__PURE__ */ new Set();
  const groups = /* @__PURE__ */ new Map();
  for (const value of data2.rows) {
    const item = object2(value);
    const rowId = id2(item.rowId);
    const skuId = id2(item.skuId);
    const groupId = id2(item.groupId);
    const qty = integer2(item.qty, 1, 999);
    if (rows.has(rowId)) throw new Error("Baris stok duplikat");
    rows.add(rowId);
    if (!balances.has(groupId)) throw new Error("Grup stok tidak dikenal");
    const group = groups.get(groupId) ?? { required: 0, sources: [] };
    const required = group.required + qty;
    if (!Number.isSafeInteger(required)) throw new Error("Kebutuhan stok melampaui batas aman");
    group.required = required;
    group.sources.push({ rowId, skuId, qty });
    groups.set(groupId, group);
  }
  const debits = [...groups.entries()].sort(([a], [b]) => compare(a, b)).map(([groupId, group]) => {
    const before = balances.get(groupId);
    return {
      groupId,
      required: group.required,
      before,
      after: before - group.required,
      sources: group.sources.sort((a, b) => compare(a.rowId, b.rowId))
    };
  });
  const shortages = debits.filter((debit) => debit.after < 0).map(({ groupId, required, before }) => ({ groupId, required, available: before }));
  return shortages.length ? { ok: false, shortages } : { ok: true, debits };
}

// src/domain/draft-stock.ts
function planDraftStockDebits(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Input stok draft tidak sah");
  const data2 = input;
  validateDraft(data2.draft);
  if (!Array.isArray(data2.skuGroups) || !Array.isArray(data2.balances)) throw new Error("Daftar stok draft tidak sah");
  const groups = /* @__PURE__ */ new Map();
  for (const value of data2.skuGroups) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Pemetaan SKU tidak sah");
    const { skuId, groupId } = value;
    if (typeof skuId !== "string" || !skuId.trim() || typeof groupId !== "string" || !groupId.trim()) throw new Error("Identitas pemetaan tidak sah");
    if (groups.has(skuId)) throw new Error("Pemetaan SKU duplikat");
    groups.set(skuId, groupId);
  }
  const rows = data2.draft.items.map((item) => {
    const groupId = groups.get(item.skuId);
    if (groupId === void 0) throw new Error("Pemetaan SKU tidak ditemukan");
    return { rowId: item.id, skuId: item.skuId, groupId, qty: item.unitIds.length };
  });
  return planStockDebits({ rows, balances: data2.balances });
}

// src/domain/first-batch.ts
function snapshotBatchDraft(draft) {
  const { orderId, displayNumber, cashSessionId, customer, channel, channelAccountId, externalOrderId, serving: serving2, note, savedAt, sourceOrderId, items, discount, taxBp, serviceBp } = draft;
  const lines = items.map(({ id: id8, unitIds, skuId, name, skuPrice, toppingPrice, promo, choices, toppings, serving: serving3, note: note2 }) => ({ id: id8, unitIds, skuId, name, skuPrice, toppingPrice, promo, choices: choices.map(({ id: id9, name: name2 }) => ({ id: id9, name: name2 })), toppings: toppings.map(({ id: id9, name: name2, price }) => ({ id: id9, name: name2, price })), serving: serving3, note: note2 }));
  return structuredClone({ orderId, displayNumber, cashSessionId, customer, channel, channelAccountId, externalOrderId, serving: serving2, note, savedAt, ...sourceOrderId === void 0 ? {} : { sourceOrderId }, items: lines, discount, taxBp, serviceBp });
}
function validateFirstBatch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Batch tidak sah");
  const batch = value;
  if (Object.keys(batch).sort().join(",") !== "confirmedAt,draft,number,skuGroups,storeId" || typeof batch.storeId !== "string" || !batch.storeId.trim() || batch.storeId.length > 200 || batch.number !== 1 || typeof batch.confirmedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(batch.confirmedAt) || !Number.isFinite(Date.parse(batch.confirmedAt))) throw new Error("Batch tidak sah");
  draftDateCode(batch.confirmedAt, "UTC");
  validateDraft(batch.draft);
  if (Object.keys(batch.draft).some((key2) => !["orderId", "displayNumber", "cashSessionId", "customer", "channel", "channelAccountId", "externalOrderId", "serving", "note", "savedAt", "sourceOrderId", "items", "discount", "taxBp", "serviceBp"].includes(key2))) throw new Error("Isi draft batch tidak sah");
  if (!Array.isArray(batch.skuGroups)) throw new Error("Pemetaan batch tidak sah");
  const skus = new Set(batch.draft.items.map((item) => item.skuId));
  const seen = /* @__PURE__ */ new Set();
  for (const value2 of batch.skuGroups) {
    if (!value2 || typeof value2 !== "object" || Array.isArray(value2) || Object.getPrototypeOf(value2) !== Object.prototype) throw new Error("Pemetaan batch tidak sah");
    const mapping = value2;
    if (Object.keys(mapping).sort().join(",") !== "groupId,skuId" || typeof mapping.skuId !== "string" || !skus.has(mapping.skuId) || seen.has(mapping.skuId) || typeof mapping.groupId !== "string" || !mapping.groupId.trim() || mapping.groupId.length > 200) throw new Error("Pemetaan batch tidak sah");
    seen.add(mapping.skuId);
  }
  if (seen.size !== skus.size) throw new Error("Pemetaan batch tidak lengkap");
}
function planFirstBatch(value, balances) {
  validateFirstBatch(value);
  return planDraftStockDebits({ draft: value.draft, skuGroups: value.skuGroups, balances });
}

// src/domain/payment.ts
function validateNoncashPayment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Pembayaran tidak sah");
  const p = value;
  if (Object.keys(p).sort().join(",") !== "amount,cashSessionId,id,method,note,orderId,paidAt,settlementId,storeId,verified" || ![p.id, p.orderId, p.storeId, p.cashSessionId, p.settlementId].every((v) => typeof v === "string" && !!v.trim() && v.length <= 200) || !["qris", "transfer", "ewallet"].includes(p.method) || p.verified !== true || !(p.note === null || typeof p.note === "string" && p.note.length <= 500) || typeof p.paidAt !== "string") throw new Error("Pembayaran tidak sah");
  draftDateCode(p.paidAt, "UTC");
  integer(p.amount, 1, Number.MAX_SAFE_INTEGER);
}
function validateCashPayment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Pembayaran tidak sah");
  const p = value;
  if (Object.keys(p).sort().join(",") !== "amount,cashSessionId,change,id,method,orderId,paidAt,received,settlementId,storeId" || ![p.id, p.orderId, p.storeId, p.cashSessionId, p.settlementId].every((v) => typeof v === "string" && !!v.trim() && v.length <= 200) || p.method !== "cash" || typeof p.paidAt !== "string") throw new Error("Pembayaran tidak sah");
  draftDateCode(p.paidAt, "UTC");
  const amount = integer(p.amount, 1, Number.MAX_SAFE_INTEGER), received = integer(p.received, 0, Number.MAX_SAFE_INTEGER), change = integer(p.change, 0, Number.MAX_SAFE_INTEGER);
  if (received < amount || change !== received - amount) throw new Error("Uang diterima atau kembalian tidak sah");
}
function validateMethodCorrection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Koreksi metode tidak sah");
  const c = value;
  const administrative = Object.hasOwn(c, "executionSessionId") || Object.hasOwn(c, "evidenceReference");
  const keys = administrative ? "actorId,amount,cashSessionId,evidenceReference,executionSessionId,from,orderId,paymentId,reason,recordedAt,storeId,to" : "actorId,amount,cashSessionId,from,orderId,paymentId,reason,recordedAt,storeId,to";
  if (Object.keys(c).sort().join(",") !== keys || ![c.paymentId, c.orderId, c.storeId, c.cashSessionId, c.actorId].every((v) => typeof v === "string" && !!v.trim() && v.length <= 200) || administrative && (typeof c.executionSessionId !== "string" || !c.executionSessionId.trim() || c.executionSessionId.length > 200 || c.executionSessionId === c.cashSessionId || typeof c.evidenceReference !== "string" || !c.evidenceReference.trim() || c.evidenceReference.length > 500) || typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 500 || !["cash", "qris", "transfer", "ewallet"].includes(c.from) || !["cash", "qris", "transfer", "ewallet"].includes(c.to) || c.from === c.to || typeof c.recordedAt !== "string") throw new Error("Koreksi metode tidak sah");
  integer(c.amount, 1, Number.MAX_SAFE_INTEGER);
  draftDateCode(c.recordedAt, "UTC");
}
function effectivePaymentMethod(payment, corrections) {
  if (payment.method === "cash") validateCashPayment(payment);
  else validateNoncashPayment(payment);
  if (!Array.isArray(corrections)) throw new Error("Histori koreksi tidak sah");
  let method = payment.method;
  for (const c of corrections) {
    validateMethodCorrection(c);
    if (c.paymentId !== payment.id || c.orderId !== payment.orderId || c.storeId !== payment.storeId || c.cashSessionId !== payment.cashSessionId || c.amount !== payment.amount || c.from !== method) throw new Error("Rantai koreksi tidak sah");
    method = c.to;
  }
  return method;
}
function correctionDeltas(correction) {
  validateMethodCorrection(correction);
  return [{ method: correction.from, delta: -correction.amount }, { method: correction.to, delta: correction.amount }];
}

// src/domain/serving.ts
function validateServingState(value, allowCancelled = false) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("State penyajian tidak sah");
  const v = value;
  if (Object.keys(v).sort().join(",") !== "cashSessionId,orderId,storeId,units" || ![v.storeId, v.orderId, v.cashSessionId].every((x) => typeof x === "string" && !!x.trim() && x.length <= 200) || !Array.isArray(v.units) || !v.units.length) throw new Error("State penyajian tidak sah");
  const ids2 = /* @__PURE__ */ new Set();
  for (const unit of v.units) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit) || Object.getPrototypeOf(unit) !== Object.prototype || Object.keys(unit).sort().join(",") !== "id,status" || typeof unit.id !== "string" || !unit.id.trim() || unit.id.length > 200 || ids2.has(unit.id) || !(allowCancelled ? ["processed", "served", "cancelled"] : ["processed", "served"]).includes(unit.status)) throw new Error("Unit penyajian tidak sah");
    ids2.add(unit.id);
  }
}
function initialServing(batch) {
  return { storeId: batch.storeId, orderId: batch.draft.orderId, cashSessionId: batch.draft.cashSessionId, units: batch.draft.items.flatMap((item) => item.unitIds.map((id8) => ({ id: id8, status: "processed" }))) };
}
function changeServing(before, unitIds, action, reason5) {
  validateServingState(before, true);
  if (!Array.isArray(unitIds) || !unitIds.length || unitIds.some((id8) => typeof id8 !== "string" || !id8.trim()) || new Set(unitIds).size !== unitIds.length) throw new Error("Pilihan unit tidak sah");
  if (action === "correct" ? typeof reason5 !== "string" || !reason5.trim() || reason5.length > 500 : reason5 !== null) throw new Error("Alasan koreksi wajib");
  const selected = new Set(unitIds), from = action === "serve" ? "processed" : "served", to = action === "serve" ? "served" : "processed";
  if ([...selected].some((id8) => !before.units.some((unit) => unit.id === id8 && unit.status === from))) throw new Error("Unit asing atau status penyajian tidak sesuai");
  return { ...before, units: before.units.map((unit) => selected.has(unit.id) ? { ...unit, status: to } : unit) };
}

// src/domain/paid-cancellation.ts
function planPaidCancellation(batch, payment, settlement2, serving2, refunds, cancelledIds, selection) {
  validateFirstBatch(batch);
  if (payment.method === "cash") validateCashPayment(payment);
  else validateNoncashPayment(payment);
  validateSettlementSnapshot(settlement2);
  validateServingState(serving2, true);
  validateRefundHistory(settlement2, refunds);
  if (settlement2.source !== "payment" || payment.id !== `payment:${payment.orderId}` || payment.settlementId !== `settlement:${payment.orderId}` || payment.orderId !== settlement2.orderId || payment.orderId !== batch.draft.orderId || payment.storeId !== batch.storeId || payment.cashSessionId !== batch.draft.cashSessionId || payment.amount !== settlement2.paymentAmount || serving2.orderId !== payment.orderId || serving2.storeId !== payment.storeId || serving2.cashSessionId !== payment.cashSessionId) throw new Error("Sumber pembatalan tidak sesuai");
  const ids2 = batch.draft.items.flatMap((item) => item.unitIds).sort();
  if (JSON.stringify(ids2) !== JSON.stringify(settlement2.units.map((unit) => unit.id).sort()) || JSON.stringify(ids2) !== JSON.stringify(serving2.units.map((unit) => unit.id).sort())) throw new Error("Unit sumber pembatalan tidak sesuai");
  if (!Array.isArray(cancelledIds) || cancelledIds.some((id8) => typeof id8 !== "string" || !ids2.includes(id8)) || new Set(cancelledIds).size !== cancelledIds.length || !Array.isArray(selection) || !selection.length) throw new Error("Pilihan pembatalan tidak sah");
  const unavailable = /* @__PURE__ */ new Set([...cancelledIds, ...refunds.flatMap((entry) => entry.unitIds)]), processed = new Set(serving2.units.filter((unit) => unit.status === "processed").map((unit) => unit.id));
  const itemIds = /* @__PURE__ */ new Set(), chosen = [];
  for (const row2 of selection) {
    if (!row2 || typeof row2 !== "object" || Array.isArray(row2) || Object.keys(row2).sort().join(",") !== "itemId,quantity" || typeof row2.itemId !== "string" || itemIds.has(row2.itemId) || !Number.isSafeInteger(row2.quantity) || row2.quantity < 1 || row2.quantity > 999) throw new Error("Pilihan pembatalan tidak sah");
    itemIds.add(row2.itemId);
    const item = batch.draft.items.find((candidate) => candidate.id === row2.itemId);
    if (!item) throw new Error("Item pembatalan tidak ditemukan");
    const eligible = item.unitIds.filter((id8) => processed.has(id8) && !unavailable.has(id8)).sort();
    if (eligible.length < row2.quantity) throw new Error("Unit pembatalan tidak tersedia");
    chosen.push(...eligible.slice(0, row2.quantity));
  }
  const units = chosen.map((id8) => ({ id: id8, amount: settlement2.totals.allocations.find((unit) => unit.id === id8).total }));
  const due = units.reduce((sum, unit) => sum + unit.amount, 0);
  if (!Number.isSafeInteger(due)) throw new Error("Nilai pembatalan tidak sah");
  return { units, due };
}
function validatePaidCancellationEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Pembatalan tidak sah");
  const v = value, id8 = (x) => typeof x === "string" && !!x.trim() && x.length <= 200;
  if (Object.keys(v).sort().join(",") !== "actorId,cashSessionId,id,kitchenConfirmed,orderId,paymentId,reason,recordedAt,storeId,units" || ![v.actorId, v.cashSessionId, v.id, v.orderId, v.paymentId, v.storeId].every(id8) || typeof v.reason !== "string" || !v.reason.trim() || v.reason.length > 500 || v.kitchenConfirmed !== true || typeof v.recordedAt !== "string" || !Array.isArray(v.units) || !v.units.length) throw new Error("Pembatalan tidak sah");
  draftDateCode(v.recordedAt, "UTC");
  const seen = /* @__PURE__ */ new Set();
  for (const unit of v.units) {
    if (!unit || typeof unit !== "object" || Array.isArray(unit) || Object.getPrototypeOf(unit) !== Object.prototype || Object.keys(unit).sort().join(",") !== "amount,id" || !id8(unit.id) || seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || unit.amount < 0) throw new Error("Unit pembatalan tidak sah");
    seen.add(unit.id);
  }
}
function paidRefundDue(cancellations, refunds) {
  const refunded = new Set(refunds.flatMap((refund2) => refund2.unitIds)), seen = /* @__PURE__ */ new Set();
  let due = 0;
  for (const event2 of cancellations) {
    validatePaidCancellationEvent(event2);
    for (const unit of event2.units) {
      if (seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || unit.amount < 0) throw new Error("Histori pembatalan tidak sah");
      seen.add(unit.id);
      if (!refunded.has(unit.id)) due += unit.amount;
    }
  }
  if (!Number.isSafeInteger(due)) throw new Error("Nilai refund due tidak sah");
  return due;
}

// src/domain/free-cancellation.ts
var id3 = (value) => typeof value === "string" && !!value.trim() && value.length <= 200;
var reason3 = (value) => typeof value === "string" && !!value.trim() && value.length <= 500;
function plain3(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function validateFreeCancellationEvent(value) {
  if (!plain3(value) || Object.keys(value).sort().join(",") !== "actorId,cashSessionId,id,kitchenConfirmed,orderId,reason,recordedAt,settlementId,storeId,unitIds" || ![value.actorId, value.cashSessionId, value.id, value.orderId, value.settlementId, value.storeId].every(id3) || !reason3(value.reason) || value.kitchenConfirmed !== true || typeof value.recordedAt !== "string" || !Array.isArray(value.unitIds) || !value.unitIds.length || !value.unitIds.every(id3) || new Set(value.unitIds).size !== value.unitIds.length) throw new Error("Pembatalan gratis tidak sah");
  draftDateCode(value.recordedAt, "UTC");
}
function validateFreeStockReturnEvent(value) {
  if (!plain3(value) || Object.keys(value).sort().join(",") !== "actorId,cancellationId,cashSessionId,id,orderId,reason,recordedAt,sellable,settlementId,source,storeId,units" || ![value.actorId, value.cashSessionId, value.id, value.orderId, value.settlementId, value.storeId].every(id3) || !reason3(value.reason) || value.sellable !== true || typeof value.recordedAt !== "string" || !(value.source === "served" && value.cancellationId === null || value.source === "cancellation" && id3(value.cancellationId)) || !Array.isArray(value.units) || !value.units.length) throw new Error("Return gratis tidak sah");
  draftDateCode(value.recordedAt, "UTC");
  const seen = /* @__PURE__ */ new Set();
  for (const unit of value.units) {
    if (!plain3(unit) || Object.keys(unit).sort().join(",") !== "groupId,id" || !id3(unit.id) || !id3(unit.groupId) || seen.has(unit.id)) throw new Error("Unit return gratis tidak sah");
    seen.add(unit.id);
  }
}
function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key2, item]) => [key2, normalized(item)]));
  return value;
}
function validateFreeSources(batch, settlement2, serving2) {
  validateFirstBatch(batch);
  validateSettlementSnapshot(settlement2);
  validateServingState(serving2, true);
  const d = batch.draft;
  const expected = freezeSettlement(d.orderId, d.items.map((i) => ({ unitIds: i.unitIds, skuId: i.skuId, skuPrice: i.skuPrice, toppingPrice: i.toppingPrice, promo: i.promo, identity: { choices: i.choices.map((c) => c.id), toppings: i.toppings.map((t) => t.id), serving: i.serving, note: i.note } })), d.discount, d.taxBp, d.serviceBp, "free");
  if (settlement2.source !== "free" || JSON.stringify(normalized(settlement2)) !== JSON.stringify(normalized(expected)) || serving2.orderId !== d.orderId || serving2.storeId !== batch.storeId || serving2.cashSessionId !== d.cashSessionId) throw new Error("Sumber pembatalan gratis tidak sesuai");
  const ids2 = d.items.flatMap((i) => i.unitIds).sort();
  if (JSON.stringify(ids2) !== JSON.stringify(serving2.units.map((u) => u.id).sort())) throw new Error("Unit penyajian tidak sesuai");
}
function planFreeCancellation(batch, settlement2, serving2, selection) {
  validateFreeSources(batch, settlement2, serving2);
  const d = batch.draft;
  if (!Array.isArray(selection) || !selection.length) throw new Error("Pilihan pembatalan tidak sah");
  const selected = [], items = /* @__PURE__ */ new Set();
  for (const row2 of selection) {
    if (!row2 || typeof row2 !== "object" || Array.isArray(row2) || Object.keys(row2).sort().join(",") !== "itemId,quantity" || typeof row2.itemId !== "string" || items.has(row2.itemId) || !Number.isSafeInteger(row2.quantity) || row2.quantity < 1 || row2.quantity > 999) throw new Error("Pilihan pembatalan tidak sah");
    items.add(row2.itemId);
    const item = d.items.find((i) => i.id === row2.itemId);
    if (!item) throw new Error("Item tidak ditemukan");
    const eligible = item.unitIds.filter((id8) => serving2.units.some((u) => u.id === id8 && u.status === "processed")).sort();
    if (eligible.length < row2.quantity) throw new Error("Unit tidak tersedia");
    selected.push(...eligible.slice(0, row2.quantity));
  }
  return selected;
}

// src/domain/payment-methods.ts
function validatePaymentMethods(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Konfigurasi metode tidak sah");
  const v = value;
  if (Object.keys(v).sort().join(",") !== "ewallet,qris,storeId,transfer" || typeof v.storeId !== "string" || !v.storeId.trim() || v.storeId.length > 200 || typeof v.qris !== "boolean" || typeof v.transfer !== "boolean" || typeof v.ewallet !== "boolean") throw new Error("Konfigurasi metode tidak sah");
}

// src/domain/served-refund.ts
var id4 = (v) => typeof v === "string" && !!v.trim() && v.length <= 200;
var reason4 = (v) => typeof v === "string" && !!v.trim() && v.length <= 500;
function plain4(v) {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}
function validateServedRefundEvent(v) {
  if (!plain4(v) || Object.keys(v).sort().join(",") !== "actorId,amount,cashSessionId,id,method,moneyReturned,orderId,paymentId,reason,recordedAt,storeId,units" || ![v.id, v.paymentId, v.orderId, v.storeId, v.cashSessionId, v.actorId].every(id4) || !reason4(v.reason) || v.moneyReturned !== true || !["cash", "qris", "transfer", "ewallet"].includes(v.method) || typeof v.recordedAt !== "string" || !Array.isArray(v.units) || !v.units.length) throw new Error("Refund tidak sah");
  draftDateCode(v.recordedAt, "UTC");
  let sum = 0;
  const seen = /* @__PURE__ */ new Set();
  for (const unit of v.units) {
    if (!plain4(unit) || Object.keys(unit).sort().join(",") !== "amount,id" || !id4(unit.id) || seen.has(unit.id) || !Number.isSafeInteger(unit.amount) || unit.amount <= 0) throw new Error("Unit refund tidak sah");
    seen.add(unit.id);
    sum += unit.amount;
  }
  if (!Number.isSafeInteger(sum) || sum !== v.amount) throw new Error("Nilai refund tidak sah");
}
function validateStockReturnEvent(v, allowCancellation = false) {
  if (!plain4(v)) throw new Error("Return stok tidak sah");
  const cancellation = Object.hasOwn(v, "cancellationId");
  if (cancellation && !allowCancellation || Object.keys(v).sort().join(",") !== (cancellation ? "actorId,cancellationId,id,orderId,paymentId,reason,recordedAt,sellable,storeId,units" : "actorId,id,orderId,paymentId,reason,recordedAt,refundId,sellable,storeId,units") || ![v.id, cancellation ? v.cancellationId : v.refundId, v.paymentId, v.orderId, v.storeId, v.actorId].every(id4) || !reason4(v.reason) || v.sellable !== true || typeof v.recordedAt !== "string" || !Array.isArray(v.units) || !v.units.length) throw new Error("Return stok tidak sah");
  draftDateCode(v.recordedAt, "UTC");
  const seen = /* @__PURE__ */ new Set();
  for (const unit of v.units) {
    if (!plain4(unit) || Object.keys(unit).sort().join(",") !== "groupId,id" || !id4(unit.id) || !id4(unit.groupId) || seen.has(unit.id)) throw new Error("Unit return tidak sah");
    seen.add(unit.id);
  }
}
function planServedRefund(batch, payment, settlement2, serving2, history2, selection) {
  validateFirstBatch(batch);
  if (payment.method === "cash") validateCashPayment(payment);
  else validateNoncashPayment(payment);
  validateSettlementSnapshot(settlement2);
  validateServingState(serving2, true);
  validateRefundHistory(settlement2, history2);
  if (settlement2.source !== "payment" || payment.id !== `payment:${payment.orderId}` || payment.settlementId !== `settlement:${payment.orderId}` || payment.orderId !== settlement2.orderId || payment.orderId !== batch.draft.orderId || payment.storeId !== batch.storeId || payment.cashSessionId !== batch.draft.cashSessionId || payment.amount !== settlement2.paymentAmount || serving2.orderId !== payment.orderId || serving2.storeId !== payment.storeId || serving2.cashSessionId !== payment.cashSessionId) throw new Error("Sumber refund tidak sesuai");
  const batchIds = batch.draft.items.flatMap((item) => item.unitIds).sort(), settlementIds = settlement2.units.map((unit) => unit.id).sort(), servingIds = serving2.units.map((unit) => unit.id).sort();
  if (JSON.stringify(batchIds) !== JSON.stringify(settlementIds) || JSON.stringify(batchIds) !== JSON.stringify(servingIds)) throw new Error("Unit sumber refund tidak sesuai");
  if (!Array.isArray(selection) || !selection.length) throw new Error("Pilihan refund wajib");
  const used = new Set(history2.flatMap((entry) => entry.unitIds)), served = new Set(serving2.units.filter((unit) => unit.status === "served").map((unit) => unit.id));
  const positive = new Set(settlement2.totals.allocations.filter((unit) => unit.total > 0).map((unit) => unit.id));
  const itemIds = /* @__PURE__ */ new Set(), chosen = [];
  for (const row2 of selection) {
    if (!row2 || typeof row2 !== "object" || Array.isArray(row2) || Object.keys(row2).sort().join(",") !== "itemId,quantity" || typeof row2.itemId !== "string" || itemIds.has(row2.itemId) || !Number.isSafeInteger(row2.quantity) || row2.quantity < 1 || row2.quantity > 999) throw new Error("Pilihan refund tidak sah");
    itemIds.add(row2.itemId);
    const item = batch.draft.items.find((candidate) => candidate.id === row2.itemId);
    if (!item) throw new Error("Item refund tidak ditemukan");
    const eligible = item.unitIds.filter((id8) => served.has(id8) && positive.has(id8) && !used.has(id8)).sort();
    if (eligible.length < row2.quantity) throw new Error("Unit refund tidak tersedia");
    chosen.push(...eligible.slice(0, row2.quantity));
  }
  return refund(settlement2, history2, chosen);
}

// src/domain/cash-session.ts
var uuid3 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function text2(v) {
  return typeof v === "string" && !!v.trim() && v.length <= 200;
}
function businessDate(time, zone) {
  draftDateCode(time, zone);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(time));
  return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k)?.value ?? "").join("-");
}
function validateCashSession(v) {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) throw new Error("Sesi kas tidak sah");
  const s = v;
  if (Object.keys(s).sort().join(",") !== "businessDate,id,initialCustodian,number,openedAt,openedBy,openingAmount,storeId,timeZone" || typeof s.id !== "string" || !uuid3.test(s.id) || ![s.storeId, s.number, s.openedBy, s.initialCustodian, s.openedAt, s.timeZone, s.businessDate].every(text2) || !Number.isSafeInteger(s.openingAmount) || s.openingAmount < 0) throw new Error("Sesi kas tidak sah");
  if (s.businessDate !== businessDate(s.openedAt, s.timeZone)) throw new Error("Tanggal bisnis tidak sesuai");
}
function cashBalance(entries, session) {
  validateCashSession(session);
  if (!Array.isArray(entries) || !entries.length) throw new Error("Ledger kas kosong");
  let balance = 0;
  entries.forEach((e, i) => {
    if (e?.kind === "refund") {
      if (i === 0 || Object.keys(e).sort().join(",") !== "kind,refund,sessionId,storeId" || e.sessionId !== session.id || e.storeId !== session.storeId) throw new Error("Ledger refund tidak sah");
      validateServedRefundEvent(e.refund);
      if (e.refund.cashSessionId !== session.id || e.refund.storeId !== session.storeId) throw new Error("Sesi refund tidak sesuai");
      if (e.refund.method === "cash") balance -= e.refund.amount;
      if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak sah");
      return;
    }
    if (e?.kind === "method-correction" || e?.kind === "method-adjustment") {
      if (i === 0 || Object.keys(e).sort().join(",") !== "correction,kind,legs,sessionId,storeId" || e.sessionId !== session.id || e.storeId !== session.storeId) throw new Error("Ledger koreksi tidak sah");
      validateMethodCorrection(e.correction);
      if ((e.kind === "method-correction" ? e.correction.cashSessionId !== session.id || e.correction.executionSessionId !== void 0 : e.correction.executionSessionId !== session.id) || e.correction.storeId !== session.storeId || (!Array.isArray(e.legs) || e.legs.length !== 2 || e.legs.some((leg, index) => !leg || Object.keys(leg).sort().join(",") !== "delta,method" || leg.method !== correctionDeltas(e.correction)[index].method || leg.delta !== correctionDeltas(e.correction)[index].delta))) throw new Error("Ledger koreksi tidak sah");
      for (const leg of e.legs) if (leg.method === "cash") balance += leg.delta;
      if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak sah");
      return;
    }
    if (!e || typeof e !== "object" || Object.keys(e).sort().join(",") !== "amount,category,description,kind,sessionId,storeId" || e.sessionId !== session.id || e.storeId !== session.storeId || !Number.isSafeInteger(e.amount) || e.amount < 0 || (i === 0 ? e.kind !== "opening" || e.amount !== session.openingAmount || e.category !== "" || e.description !== "" : e.kind !== "in" && e.kind !== "out" && e.kind !== "sale" || e.amount === 0 || (e.kind === "sale" ? e.category !== "" || e.description !== "" : !text2(e.category) || !text2(e.description)))) throw new Error("Ledger kas tidak sah");
    balance += e.kind === "out" ? -e.amount : e.amount;
    if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak sah");
  });
  return balance;
}

// src/domain/stock-group.ts
function validateStockGroup(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Grup stok tidak sah");
  const v = value;
  if (Object.keys(v).sort().join(",") !== "balance,baseline,groupId,minimum,storeId" || ![v.groupId, v.storeId].every((id8) => typeof id8 === "string" && !!id8.trim() && id8.length <= 200) || ![v.baseline, v.balance, v.minimum].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0)) throw new Error("Grup stok tidak sah");
}

// src/domain/order-additions.ts
var id5 = (value) => typeof value === "string" && !!value.trim() && value.length <= 200;
var record = (value) => !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
function validateLines(lines) {
  if (!Array.isArray(lines)) throw new Error("Baris tambahan tidak sah");
  if (!lines.length) return;
  validateDraft({ orderId: "00000000-0000-4000-8000-000000000001", displayNumber: "260101-E1-0001", cashSessionId: "00000000-0000-4000-8000-000000000002", customer: "Pelanggan", channel: "store", channelAccountId: "", externalOrderId: "", serving: "takeaway", note: "", savedAt: "2026-01-01T00:00:00.000Z", items: lines, discount: { kind: "none" }, taxBp: 0, serviceBp: 0 });
}
function validateOrderAdditions(value) {
  if (!record(value) || Object.keys(value).sort().join(",") !== "batchCount,cashSessionId,orderId,pending,storeId" || !id5(value.storeId) || !id5(value.orderId) || !id5(value.cashSessionId) || !Number.isSafeInteger(value.batchCount) || value.batchCount < 1) throw new Error("Head tambahan tidak sah");
  validateLines(value.pending);
  const units = value.pending.flatMap((item) => item.unitIds);
  if (new Set(units).size !== units.length) throw new Error("Unit tambahan ganda");
}
function validateAdditionalBatch(value) {
  if (!record(value) || Object.keys(value).sort().join(",") !== "cashSessionId,confirmedAt,draft,number,orderId,skuGroups,storeId" || !id5(value.storeId) || !id5(value.orderId) || !id5(value.cashSessionId) || !Number.isSafeInteger(value.number) || value.number < 2 || typeof value.confirmedAt !== "string" || !Number.isFinite(Date.parse(value.confirmedAt))) throw new Error("Batch tambahan tidak sah");
  draftDateCode(value.confirmedAt, "UTC");
  validateDraft(value.draft);
  if (value.draft.orderId !== value.orderId || value.draft.cashSessionId !== value.cashSessionId || !Array.isArray(value.skuGroups)) throw new Error("Batch tambahan tidak sah");
  const skuIds = new Set(value.draft.items.map((item) => item.skuId)), seen = /* @__PURE__ */ new Set();
  for (const mapping of value.skuGroups) {
    if (!record(mapping) || Object.keys(mapping).sort().join(",") !== "groupId,skuId" || !id5(mapping.skuId) || !id5(mapping.groupId) || !skuIds.has(mapping.skuId) || seen.has(mapping.skuId)) throw new Error("Pemetaan batch tambahan tidak sah");
    seen.add(mapping.skuId);
  }
  if (seen.size !== skuIds.size) throw new Error("Pemetaan batch tambahan tidak lengkap");
  const units = value.draft.items.flatMap((item) => item.unitIds);
  if (new Set(units).size !== units.length) throw new Error("Unit batch tambahan ganda");
}
function makeAdditionalBatch(head, base, number, confirmedAt, items, skuGroups) {
  validateOrderAdditions(head);
  validateDraft(base);
  if (base.orderId !== head.orderId || base.cashSessionId !== head.cashSessionId || number !== head.batchCount + 1) throw new Error("Urutan batch tambahan tidak sah");
  const prior = new Set(base.items.flatMap((item) => item.unitIds));
  if (items.flatMap((item) => item.unitIds).some((unitId) => prior.has(unitId))) throw new Error("Unit tambahan sudah ada pada pesanan");
  const draft = { ...structuredClone(base), savedAt: confirmedAt, items: structuredClone(items) };
  const batch = { storeId: head.storeId, orderId: head.orderId, cashSessionId: head.cashSessionId, number, confirmedAt, draft, skuGroups: structuredClone(skuGroups) };
  validateAdditionalBatch(batch);
  return batch;
}
function planAdditionalBatchDebits(batch, balances) {
  validateAdditionalBatch(batch);
  return planDraftStockDebits({ draft: batch.draft, skuGroups: batch.skuGroups, balances });
}

// src/domain/business-record.ts
var SETTLEMENT_RECORD = "settlement";
var REFUND_HISTORY_RECORD = "refund-history";
var DRAFT_RECORD = "draft";
var STOCK_GROUP_RECORD = "stock-group";
function validateSkuStockMapping(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Pemetaan tidak sah");
  const v = value;
  if (Object.keys(v).sort().join(",") !== "groupId,skuId,storeId" || ![v.storeId, v.skuId, v.groupId].every((x) => typeof x === "string" && !!x.trim() && x.length <= 200)) throw new Error("Pemetaan tidak sah");
}
function validateBusinessRecord(value) {
  if (value === null || typeof value !== "object" || !Object.hasOwn(value, "recordType")) return;
  if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Record bisnis tidak sah");
  const record2 = value;
  if (record2.schemaVersion !== 1 && !(record2.schemaVersion === 2 && ["draft", "first-batch", "kitchen-job", "customer-job", "payment", "serving", "stock-returns", "served-refunds"].includes(record2.recordType)) && !(record2.schemaVersion === 3 && record2.recordType === "customer-job") && !(record2.schemaVersion === 4 && record2.recordType === "customer-job")) throw new Error("Versi record bisnis tidak didukung");
  if (record2.recordType === "simple-catalog") {
    if (Object.keys(record2).sort().join(",") !== "catalog,recordType,schemaVersion") throw new Error("Record katalog tidak sah");
    validateSimpleCatalog(record2.catalog);
  } else if (record2.recordType === "cash-count") {
    if (Object.keys(record2).sort().join(",") !== "history,recordType,schemaVersion") throw new Error("Record hitungan tidak sah");
    validateCashCountHistory(record2.history);
  } else if (record2.recordType === "unpaid-cancellation") {
    if (Object.keys(record2).sort().join(",") !== "cancellation,recordType,schemaVersion") throw new Error("Record pembatalan unpaid tidak sah");
    validateUnpaidCancellation(record2.cancellation);
  } else if (record2.recordType === "unpaid-stock-returns") {
    if (Object.keys(record2).sort().join(",") !== "recordType,returns,schemaVersion" || !Array.isArray(record2.returns) || !record2.returns.length) throw new Error("Histori return unpaid tidak sah");
    for (const r of record2.returns) validateUnpaidReturn(r);
  } else if (record2.recordType === "draft-cancellation") {
    if (Object.keys(record2).sort().join(",") !== "cancellation,recordType,schemaVersion") throw new Error("Record pembatalan draft tidak sah");
    validateDraftCancellation(record2.cancellation);
  } else if (record2.recordType === "free-cancellations") {
    if (Object.keys(record2).sort().join(",") !== "cancellations,recordType,schemaVersion" || !Array.isArray(record2.cancellations) || !record2.cancellations.length) throw new Error("Histori pembatalan gratis tidak sah");
    for (const c of record2.cancellations) validateFreeCancellationEvent(c);
  } else if (record2.recordType === "free-stock-returns") {
    if (Object.keys(record2).sort().join(",") !== "recordType,returns,schemaVersion" || !Array.isArray(record2.returns) || !record2.returns.length) throw new Error("Histori return gratis tidak sah");
    for (const r of record2.returns) validateFreeStockReturnEvent(r);
  } else if (record2.recordType === "paid-cancellations") {
    if (Object.keys(record2).sort().join(",") !== "cancellations,recordType,schemaVersion" || !Array.isArray(record2.cancellations) || !record2.cancellations.length) throw new Error("Histori pembatalan tidak sah");
    for (const c of record2.cancellations) validatePaidCancellationEvent(c);
  } else if (record2.recordType === "served-refunds") {
    if (Object.keys(record2).sort().join(",") !== "recordType,refunds,schemaVersion" || !Array.isArray(record2.refunds) || !record2.refunds.length) throw new Error("Histori refund tidak sah");
    for (const r of record2.refunds) validateServedRefundEvent(r);
  } else if (record2.recordType === "stock-returns") {
    if (Object.keys(record2).sort().join(",") !== "recordType,returns,schemaVersion" || !Array.isArray(record2.returns) || !record2.returns.length) throw new Error("Histori return tidak sah");
    for (const r of record2.returns) validateStockReturnEvent(r, record2.schemaVersion === 2);
  } else if (record2.recordType === "payment-corrections") {
    if (Object.keys(record2).sort().join(",") !== "corrections,recordType,schemaVersion" || !Array.isArray(record2.corrections) || !record2.corrections.length) throw new Error("Histori koreksi tidak sah");
    for (const c of record2.corrections) validateMethodCorrection(c);
  } else if (record2.recordType === "payment-methods") {
    if (Object.keys(record2).sort().join(",") !== "methods,recordType,schemaVersion") throw new Error("Record metode tidak sah");
    validatePaymentMethods(record2.methods);
  } else if (record2.recordType === "payment") {
    if (Object.keys(record2).sort().join(",") !== "payment,recordType,schemaVersion") throw new Error("Record payment tidak sah");
    if (record2.schemaVersion === 1) validateCashPayment(record2.payment);
    else validateNoncashPayment(record2.payment);
  } else if (record2.recordType === "customer-job") {
    if (record2.schemaVersion === 4) {
      if (Object.keys(record2).sort().join(",") !== "batches,payment,recordType,schemaVersion,settlement" || !Array.isArray(record2.batches) || record2.batches.length !== 2) throw new Error("Job pelanggan tambahan tidak sah");
      validateCashPayment(record2.payment);
      validateFirstBatch(record2.batches[0]);
      validateAdditionalBatch(record2.batches[1]);
      if (record2.batches[0].draft.orderId !== record2.batches[1].orderId) throw new Error("Job pelanggan tambahan tidak sah");
    } else if (record2.schemaVersion === 1 || record2.schemaVersion === 3) {
      if (Object.keys(record2).sort().join(",") !== "batch,payment,recordType,schemaVersion,settlement") throw new Error("Job pelanggan tidak sah");
      if (record2.schemaVersion === 1) validateCashPayment(record2.payment);
      else validateNoncashPayment(record2.payment);
    } else if (Object.keys(record2).sort().join(",") !== "batch,reason,recordType,schemaVersion,settlement" || typeof record2.reason !== "string" || !record2.reason.trim() || record2.reason.length > 500) throw new Error("Job pelanggan gratis tidak sah");
    validateSettlementSnapshot(record2.settlement);
    if (record2.schemaVersion === 2 && record2.settlement.source !== "free") throw new Error("Job pelanggan gratis tidak sah");
    if (record2.schemaVersion !== 4) validateFirstBatch(record2.batch);
  } else if (record2.recordType === "serving") {
    if (Object.keys(record2).sort().join(",") !== "recordType,schemaVersion,serving") throw new Error("Record penyajian tidak sah");
    validateServingState(record2.serving, record2.schemaVersion === 2);
  } else if (record2.recordType === "cash-session") {
    if (Object.keys(record2).sort().join(",") !== "recordType,schemaVersion,session") throw new Error("Record kas tidak sah");
    validateCashSession(record2.session);
  } else if (record2.recordType === "first-batch" || record2.recordType === "kitchen-job") {
    if (Object.keys(record2).sort().join(",") !== "batch,recordType,schemaVersion") throw new Error("Record batch tidak sah");
    validateFirstBatch(record2.batch);
  } else if (record2.recordType === "order-additions") {
    if (Object.keys(record2).sort().join(",") !== "additions,recordType,schemaVersion") throw new Error("Head tambahan tidak sah");
    validateOrderAdditions(record2.additions);
  } else if (record2.recordType === "order-batch" || record2.recordType === "kitchen-job-addition") {
    if (Object.keys(record2).sort().join(",") !== "batch,recordType,schemaVersion") throw new Error("Record batch tambahan tidak sah");
    validateAdditionalBatch(record2.batch);
  } else if (record2.recordType === "sku-stock-mapping") validateSkuStockMapping(record2.mapping);
  else if (record2.recordType === STOCK_GROUP_RECORD) validateStockGroup(record2.stockGroup);
  else if (record2.recordType === DRAFT_RECORD) validateDraft(record2.draft);
  else if (record2.recordType === SETTLEMENT_RECORD) validateSettlementSnapshot(record2.settlement);
  else if (record2.recordType === REFUND_HISTORY_RECORD) validateRefundHistory(record2.settlement, record2.refunds);
  else throw new Error("Jenis record bisnis tidak dikenal");
}
function createStockGroupRecord(stockGroup) {
  validateStockGroup(stockGroup);
  return { recordType: STOCK_GROUP_RECORD, schemaVersion: 1, stockGroup: structuredClone(stockGroup) };
}
function createSkuStockMappingRecord(mapping) {
  validateSkuStockMapping(mapping);
  return { recordType: "sku-stock-mapping", schemaVersion: 1, mapping: structuredClone(mapping) };
}

// src/storage/cash-sessions.ts
var key = (id8) => `cash-session:${id8}`;
function cashMovements(changes2, id8) {
  return changes2.filter((c) => (c.kind === "cash.open" || c.kind === "cash.move") && c.targetId === id8 || (c.kind === "payment.confirmed-cash" || c.kind === "payment.draft-cash" || c.kind === "payment.multi-batch-cash" || c.kind === "payment.correct-method" || c.kind === "payment.adjust-closed-method" || c.kind === "refund.served" || c.kind === "refund.cancelled" || c.kind === "cancellation.refund-paid") && c.state.some((s) => s.key === key(id8))).sort((a, b) => (a.state.find((s) => s.key === key(id8)).expectedRevision ?? -1) - (b.state.find((s) => s.key === key(id8)).expectedRevision ?? -1)).map((c) => c.ledger[0].value);
}
function makeCashChange(session, data2, meta, revision2, before, previousClose) {
  const opening = revision2 === null;
  const entry = opening ? { kind: "opening", sessionId: session.id, storeId: session.storeId, amount: session.openingAmount, category: "", description: "" } : { kind: data2.kind, sessionId: session.id, storeId: session.storeId, amount: data2.amount, category: data2.category, description: data2.description };
  const balance = opening ? entry.amount : before + (entry.kind === "out" ? -entry.amount : entry.amount);
  if (!Number.isSafeInteger(balance) || balance < 0 || !opening && (!Number.isSafeInteger(entry.amount) || entry.amount <= 0 || !["in", "out"].includes(entry.kind) || typeof entry.category !== "string" || !entry.category.trim() || entry.category.length > 200 || typeof entry.description !== "string" || !entry.description.trim() || entry.description.length > 200)) throw new Error("Pergerakan kas tidak sah");
  draftDateCode(meta.recordedAt, "UTC");
  const operationId = meta.operationId, action = opening ? "open" : "move";
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: `cash.${action}`, targetId: session.id, payload: previousClose ? { data: data2, metadata: meta, previousClose } : { data: data2, metadata: meta }, state: [{ key: key(session.id), expectedRevision: revision2, value: { recordType: "cash-session", schemaVersion: 1, session } }], ledger: [{ id: `cash-ledger:${operationId}`, operationId, value: entry }], audit: [{ id: `cash-audit:${operationId}`, operationId, value: { action, actorId: meta.actorId, policyVersion: meta.policyVersion, occurredAt: meta.recordedAt, sessionId: session.id, before, after: balance } }], outbox: { id: `cash-outbox:${operationId}`, operationId, value: { sessionId: session.id } }, result: { sessionId: session.id, revision: (revision2 ?? -1) + 1, balance } };
}

// src/domain/order-status.ts
function reduceOrderStatus(source2) {
  const counts = { draft: 0, processed: 0, served: 0, cancelled: 0 };
  if (source2.serving) for (const unit of source2.serving.units) counts[unit.status]++;
  else if (source2.draftCancelled) counts.cancelled = source2.draftUnits;
  else counts.draft = source2.draftUnits;
  const refundDue = paidRefundDue(source2.cancellations, source2.refunds);
  const terminal = counts.draft === 0 && counts.processed === 0;
  const cancelledWithoutSettlement = source2.settlement === "unpaid" && terminal && counts.cancelled > 0 && counts.served === 0;
  const classification = cancelledWithoutSettlement ? "cancelled_without_settlement" : counts.draft ? "stored" : source2.settlement !== "unpaid" && terminal && refundDue === 0 ? "history" : "active";
  const reasons = [];
  if (counts.draft) reasons.push("draft");
  if (counts.processed) reasons.push("processed");
  if (source2.settlement === "unpaid" && !cancelledWithoutSettlement) reasons.push("unsettled");
  if (refundDue > 0) reasons.push("refund_due");
  return { orderId: source2.orderId, displayNumber: source2.displayNumber, cashSessionId: source2.cashSessionId, counts, settlement: source2.settlement, refundDue, classification, reasons };
}

// src/storage/order-status.ts
var relevant = ["order", "draft", "first-batch", "order-additions", "order-batch", "kitchen-job-addition", "serving", "draft-cancellation", "unpaid-cancellation", "paid-cancellations", "free-cancellations", "settlement", "payment", "served-refunds", "refund-history", "stock-returns", "free-stock-returns", "unpaid-stock-returns", "customer-job", "kitchen-job", "payment-corrections"];
var batchKinds = ["batch.confirm-first", "payment.draft-cash", "payment.draft-noncash", "settlement.draft-free"];
var settlementKinds = ["payment.confirmed-cash", "payment.draft-cash", "payment.multi-batch-cash", "payment.confirmed-noncash", "payment.draft-noncash", "settlement.confirmed-free", "settlement.draft-free"];
function assertId(id8) {
  if (typeof id8 !== "string" || !id8.trim() || id8.length > 200) throw new Error("ID tidak sah");
}
function changes(snapshot) {
  return snapshot.receipts.map((row2) => JSON.parse(row2.payload));
}
function source(changes2, key2) {
  return changes2.find((c) => c.state.some((row2) => row2.key === key2 && row2.expectedRevision === null));
}
function row(snapshot, key2) {
  return snapshot.state.find((r) => r.key === key2)?.value;
}
function typed(snapshot, key2, type) {
  const value = row(snapshot, key2);
  if (value === void 0) return void 0;
  if (!value || typeof value !== "object" || value.recordType !== type) throw new Error(`Sumber ${key2} rusak`);
  return value;
}
function read(snapshot, cs, storeId, orderId) {
  const draftKey = `draft:${orderId}`, bkey = `first-batch:${orderId}`;
  for (const key2 of [draftKey, bkey]) {
    const value = row(snapshot, key2);
    if (value !== void 0 && (!value || typeof value !== "object" || !("recordType" in value))) return { status: null, incomplete: [{ key: key2, reason: "Record generik belum didukung" }] };
  }
  const draft = typed(snapshot, draftKey, "draft"), batch = typed(snapshot, bkey, "first-batch");
  if (!draft || draft.recordType !== "draft") {
    if (batch) throw new Error("Draft sumber hilang");
    const foreign = cs.some((c) => c.targetId === orderId && c.storeId === storeId);
    return { status: null, incomplete: foreign ? [{ key: draftKey, reason: "Sumber pesanan tidak didukung" }] : [] };
  }
  const origin = source(cs, draftKey);
  if (!origin) throw new Error("Asal draft hilang");
  if (origin.storeId !== storeId) return { status: null, incomplete: [] };
  const d = draft.draft;
  if (d.orderId !== orderId) throw new Error("ID draft tidak sesuai");
  const session = typed(snapshot, `cash-session:${d.cashSessionId}`, "cash-session");
  if (!session || session.recordType !== "cash-session" || session.session.id !== d.cashSessionId || session.session.storeId !== storeId) throw new Error("Sesi pesanan tidak sesuai");
  const incomplete = [];
  for (const r of snapshot.state) {
    const v = r.value;
    const origin2 = source(cs, r.key);
    if (origin2?.storeId === storeId && v && typeof v === "object" && (v.recordType === "settlement" || v.recordType === "refund-history") && v.settlement.orderId === orderId && r.key !== `${v.recordType}:${orderId}`) incomplete.push({ key: r.key, reason: "Sumber finansial generik belum didukung" });
  }
  if (draft.schemaVersion !== 2 || !["draft.create"].includes(origin.kind) || d.channel !== "store") incomplete.push({ key: draftKey, reason: "Sumber draft legacy atau platform belum didukung" });
  for (const prefix2 of relevant) {
    const key2 = `${prefix2}:${orderId}`, value = row(snapshot, key2), creator = source(cs, key2);
    if (value !== void 0 && (!creator || creator.storeId !== storeId)) throw new Error(`Asal ${key2} tidak sesuai`);
    if (value !== void 0 && (!value || typeof value !== "object" || !("recordType" in value))) incomplete.push({ key: key2, reason: "Record generik belum didukung" });
  }
  if (incomplete.length) return { status: null, incomplete };
  const cancellation = typed(snapshot, `draft-cancellation:${orderId}`, "draft-cancellation");
  if (batch && batch.recordType !== "first-batch") throw new Error("Batch tidak sah");
  if (batch && (batch.schemaVersion !== 2 || !batchKinds.includes(source(cs, bkey)?.kind ?? ""))) return { status: null, incomplete: [{ key: bkey, reason: "Asal batch belum didukung" }] };
  if (batch && (batch.batch.storeId !== storeId || batch.batch.draft.orderId !== orderId || batch.batch.draft.cashSessionId !== d.cashSessionId || batch.batch.draft.displayNumber !== d.displayNumber)) throw new Error("Referensi batch tidak sesuai");
  const additionHead = typed(snapshot, `order-additions:${orderId}`, "order-additions"), additional = typed(snapshot, `order-batch:${orderId}:2`, "order-batch");
  if (additionHead && (!batch || additionHead.additions.storeId !== storeId || additionHead.additions.orderId !== orderId || additionHead.additions.cashSessionId !== d.cashSessionId || additionHead.additions.batchCount !== 2 || additionHead.additions.pending.length || !additional)) throw new Error("Head tambahan tidak sesuai");
  if (additional && (!additionHead || additional.batch.storeId !== storeId || additional.batch.orderId !== orderId || additional.batch.cashSessionId !== d.cashSessionId || additional.batch.number !== 2)) throw new Error("Batch tambahan tidak sesuai");
  if (batch && cancellation) throw new Error("Draft batal memiliki batch");
  const servingRow = typed(snapshot, `serving:${orderId}`, "serving");
  if (servingRow && servingRow.recordType !== "serving") throw new Error("Penyajian tidak sah");
  if (servingRow && !batch) throw new Error("Penyajian tanpa batch");
  const serving2 = batch ? servingRow?.serving ?? { ...initialServing(batch.batch), units: [...initialServing(batch.batch).units, ...additional?.batch.draft.items.flatMap((i) => i.unitIds.map((id8) => ({ id: id8, status: "processed" }))) ?? []] } : null;
  if (serving2 && batch) {
    const expected = { ...initialServing(batch.batch), units: [...initialServing(batch.batch).units, ...additional?.batch.draft.items.flatMap((i) => i.unitIds.map((id8) => ({ id: id8, status: "processed" }))) ?? []] };
    if (serving2.storeId !== storeId || serving2.orderId !== orderId || serving2.cashSessionId !== d.cashSessionId || canonical(serving2.units.map((u) => u.id).sort()) !== canonical(expected.units.map((u) => u.id).sort())) throw new Error("Unit penyajian tidak sesuai");
  }
  const sr = typed(snapshot, `settlement:${orderId}`, "settlement"), pr = typed(snapshot, `payment:${orderId}`, "payment");
  if (sr && sr.recordType !== "settlement" || pr && pr.recordType !== "payment") throw new Error("Settlement tidak sah");
  if (sr && (!batch || sr.settlement.orderId !== orderId)) throw new Error("Settlement tanpa sumber");
  if (sr && (!settlementKinds.includes(source(cs, `settlement:${orderId}`)?.kind ?? "") || sr.settlement.source === "platform")) return { status: null, incomplete: [{ key: `settlement:${orderId}`, reason: "Settlement belum didukung" }] };
  if (pr && (!sr || sr.settlement.source !== "payment" || pr.payment.storeId !== storeId || pr.payment.orderId !== orderId || pr.payment.cashSessionId !== d.cashSessionId || pr.payment.amount !== sr.settlement.paymentAmount)) throw new Error("Payment tidak sesuai");
  if (sr && sr.settlement.source === "payment" !== !!pr) throw new Error("Payment hilang");
  if (sr && batch && canonical(sr.settlement.units.map((u) => u.id).sort()) !== canonical((serving2 ?? initialServing(batch.batch)).units.map((u) => u.id).sort())) throw new Error("Unit settlement tidak sesuai");
  const paid = typed(snapshot, `paid-cancellations:${orderId}`, "paid-cancellations"), free = typed(snapshot, `free-cancellations:${orderId}`, "free-cancellations"), unpaid = typed(snapshot, `unpaid-cancellation:${orderId}`, "unpaid-cancellation"), refund2 = typed(snapshot, `served-refunds:${orderId}`, "served-refunds");
  if (paid && paid.recordType !== "paid-cancellations" || free && free.recordType !== "free-cancellations" || unpaid && unpaid.recordType !== "unpaid-cancellation" || refund2 && refund2.recordType !== "served-refunds") throw new Error("Histori tidak sah");
  const settlement2 = sr?.settlement.source === "payment" ? "paid" : sr?.settlement.source === "free" ? "free" : "unpaid";
  if ((paid || refund2) && settlement2 !== "paid" || free && settlement2 !== "free" || unpaid && settlement2 !== "unpaid") throw new Error("Histori tidak sesuai settlement");
  const cancellations = paid?.cancellations ?? [], refunds = (refund2?.refunds ?? []).map((r) => ({ unitIds: r.units.map((u) => u.id), amount: r.amount, source: "payment" }));
  if (refunds.length && sr) validateRefundHistory(sr.settlement, refunds);
  const cancelledIds = [...cancellations.flatMap((c) => c.units.map((u) => u.id)), ...free?.cancellations.flatMap((c) => c.unitIds) ?? [], ...unpaid?.cancellation.unitIds ?? []];
  if (serving2 && canonical([...cancelledIds].sort()) !== canonical(serving2.units.filter((u) => u.status === "cancelled").map((u) => u.id).sort())) throw new Error("Unit pembatalan tidak sesuai");
  if (cancellations.some((c) => c.orderId !== orderId || c.storeId !== storeId || c.cashSessionId !== d.cashSessionId || c.units.some((u) => sr?.settlement.totals.allocations.find((a) => a.id === u.id)?.total !== u.amount))) throw new Error("Alokasi pembatalan tidak sesuai");
  if (row(snapshot, `refund-history:${orderId}`)) return { status: null, incomplete: [{ key: `refund-history:${orderId}`, reason: "Histori refund generik belum didukung" }] };
  return { status: reduceOrderStatus({ orderId, displayNumber: d.displayNumber, cashSessionId: d.cashSessionId, draftUnits: [...d.items, ...additional?.batch.draft.items ?? []].reduce((n, i) => n + i.unitIds.length, 0), draftCancelled: !!cancellation, serving: serving2, settlement: settlement2, cancellations, refunds }), incomplete: [] };
}
function sessionCloseBlockers(s, storeId, sessionId) {
  assertId(storeId);
  assertId(sessionId);
  const cs = changes(s), session = typed(s, `cash-session:${sessionId}`, "cash-session");
  if (!session || session.recordType !== "cash-session" || session.session.storeId !== storeId || session.session.id !== sessionId) throw new Error("Sesi tidak ditemukan");
  const ids2 = /* @__PURE__ */ new Set();
  const incomplete = [];
  for (const r of s.state) {
    const origin = source(cs, r.key);
    if (origin?.storeId !== storeId) continue;
    const value = r.value;
    if (value && typeof value === "object" && (value.recordType === "settlement" || value.recordType === "refund-history")) ids2.add(value.settlement.orderId);
    const prefix2 = relevant.find((p) => r.key.startsWith(`${p}:`));
    if (!prefix2) {
      if (!value || typeof value !== "object" || !("recordType" in value)) incomplete.push({ key: r.key, reason: "Record generik belum didukung" });
      continue;
    }
    const id8 = r.key.slice(prefix2.length + 1);
    if (!r.value || typeof r.value !== "object" || !("recordType" in r.value)) {
      incomplete.push({ key: r.key, reason: "Record generik belum didukung" });
      continue;
    }
    ids2.add(id8);
  }
  const blockers = [];
  for (const id8 of [...ids2].sort()) {
    const candidate = row(s, `draft:${id8}`);
    if (candidate?.recordType === "draft" && candidate.draft.cashSessionId !== sessionId) continue;
    const result = read(s, cs, storeId, id8);
    incomplete.push(...result.incomplete);
    if (result.status?.cashSessionId === sessionId && result.status.reasons.length) blockers.push(result.status);
  }
  blockers.sort((a, b) => a.displayNumber.localeCompare(b.displayNumber) || a.orderId.localeCompare(b.orderId));
  incomplete.sort((a, b) => a.key.localeCompare(b.key) || a.reason.localeCompare(b.reason));
  return structuredClone({ blockers, incomplete: incomplete.filter((v, i) => i === 0 || v.key !== incomplete[i - 1].key || v.reason !== incomplete[i - 1].reason) });
}

// src/storage/cash-count.ts
var countKey = (id8) => `cash-count:${id8}`;
var sessionKey = (id8) => `cash-session:${id8}`;
function countBoundary(snapshot) {
  return snapshot.sequences.map((s) => ({ key: s.key, sequence: s.sequence })).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}
function makeCashCountChange(snapshot, action, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2)) throw new Error("Intent hitungan tidak sah");
  const purpose = data2.purpose ?? "close";
  const base = ["expectedCountRevision", "expectedSessionRevision", "sessionId"];
  const validKeys = (required, optional = []) => required.every((k) => Object.hasOwn(data2, k)) && Object.keys(data2).every((k) => required.includes(k) || optional.includes(k));
  const validReason = (v) => v === void 0 || v === null || typeof v === "string" && !!v.trim() && v.length <= 500;
  if (data2.purpose !== void 0 && data2.purpose !== "handover") throw new Error("Tujuan hitungan tidak sah");
  const purposeKey = purpose === "handover" ? ["purpose"] : [];
  if (action === "save" || action === "revise") {
    if (!validKeys([...base, ...purposeKey, "amount"]) || !Number.isSafeInteger(data2.amount) || data2.amount < 0) throw new Error("Nilai hitungan tidak sah");
  } else if (action === "cancel") {
    if (!validKeys([...base, ...purposeKey], purpose === "handover" ? ["reason"] : []) || !validReason(data2.reason)) throw new Error("Intent batal tidak sah");
  } else if (action === "close") {
    if (purpose !== "close" || !validKeys(base, ["reason"]) || !validReason(data2.reason)) throw new Error("Alasan tidak sah");
  } else if (action === "handover") {
    if (purpose !== "handover" || !validKeys([...base, "purpose", "incoming", "received"], ["reason", "withoutOutgoingReason"]) || typeof data2.incoming !== "string" || !data2.incoming.trim() || data2.incoming.length > 200 || !Number.isSafeInteger(data2.received) || data2.received < 0 || !validReason(data2.reason) || !validReason(data2.withoutOutgoingReason)) throw new Error("Intent serah-terima tidak sah");
  } else throw new Error("Aksi hitungan tidak sah");
  if (!Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || data2.expectedSessionRevision === Number.MAX_SAFE_INTEGER || !(data2.expectedCountRevision === null || Number.isSafeInteger(data2.expectedCountRevision) && data2.expectedCountRevision >= 0 && data2.expectedCountRevision < Number.MAX_SAFE_INTEGER)) throw new Error("Revisi hitungan tidak sah");
  draftDateCode(meta.recordedAt, "UTC");
  const row2 = snapshot.state.find((r) => r.key === sessionKey(data2.sessionId)), record2 = row2?.value;
  if (!row2 || row2.revision !== data2.expectedSessionRevision || record2?.recordType !== "cash-session" || !record2.session || record2.session.id !== data2.sessionId || record2.session.storeId !== meta.storeId) throw new Error("Sesi atau revisi tidak sesuai");
  const count = snapshot.state.find((r) => r.key === countKey(data2.sessionId)), value = count?.value;
  if ((count?.revision ?? null) !== data2.expectedCountRevision || count && (value?.recordType !== "cash-count" || !value.history)) throw new Error("Revisi hitungan berubah");
  const history2 = value?.history ?? { sessionId: data2.sessionId, storeId: meta.storeId, events: [] };
  if (count) validateCashCountHistory(history2);
  if (history2.sessionId !== data2.sessionId || history2.storeId !== meta.storeId) throw new Error("Sumber hitungan tidak sesuai");
  const last = history2.events.at(-1), active = last && (last.action === "save" || last.action === "revise") ? last : void 0;
  if (last?.action === "close" || (action === "save" ? !!active : !active) || active && active.purpose !== purpose) throw new Error("Status hitungan tidak sesuai");
  if (purpose === "close" && action !== "cancel") {
    const result = sessionCloseBlockers(snapshot, meta.storeId, data2.sessionId);
    if (result.blockers.length || result.incomplete.length) throw new Error("Blocker atau sumber sesi belum lengkap");
  }
  const current = custodySegments(record2.session, history2.events.length ? history2 : null).at(-1);
  if (current.closingOperationId !== null) throw new Error("Sesi sudah ditutup");
  const final = action === "close" || action === "handover";
  const expected = final ? cashBalance(cashMovements(snapshot.receipts.map((r) => JSON.parse(r.payload)), data2.sessionId), record2.session) : null;
  const amount = final ? active.amount : action === "save" || action === "revise" ? data2.amount : null;
  const comparison = expected === null ? null : compareCashCount(current, amount, expected);
  const difference = comparison?.difference ?? null, segmentExpected = comparison?.segmentExpected ?? null, segmentDifference = comparison?.segmentDifference ?? null;
  const reason5 = final || action === "cancel" && purpose === "handover" ? data2.reason ?? null : null;
  if (action === "close" && ((difference !== 0 || segmentDifference !== 0) && reason5 === null)) throw new Error("Alasan selisih wajib");
  if (action === "close" && history2.events.some((e) => e.action === "handover") && meta.actorId !== current.custodian) throw new Error("Penanggung jawab tutup tidak sesuai");
  let handover;
  if (action === "handover") {
    const without = data2.withoutOutgoingReason ?? null;
    if (data2.incoming === current.custodian || data2.received !== amount || meta.actorId !== data2.incoming || segmentDifference !== 0 && reason5 === null) throw new Error("Konfirmasi serah-terima tidak sesuai");
    const start = history2.events.length - 1 - [...history2.events].reverse().findIndex((e) => e.action === "save");
    const countActors = history2.events.slice(start).filter((e) => e.action === "save" || e.action === "revise").map((e) => e.actorId);
    if (without === null ? countActors.some((id8) => id8 !== current.custodian) : countActors.some((id8) => id8 !== meta.actorId)) throw new Error("Actor hitungan tidak sesuai");
    handover = { outgoing: current.custodian, incoming: data2.incoming, received: data2.received, withoutOutgoingReason: without, segmentExpected, segmentDifference };
  }
  const event2 = { action, purpose, operationId: meta.operationId, actorId: meta.actorId, occurredAt: meta.recordedAt, sessionRevision: row2.revision, boundary: countBoundary(snapshot), amount, reason: reason5, countOperationId: final ? active.operationId : null, expected, difference, blockers: [], incomplete: [], ...handover ? { handover } : {} };
  const next = { ...history2, events: [...history2.events, event2] };
  validateCashCountHistory(next);
  custodySegments(record2.session, next);
  const operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: `cash-count.${action}`, targetId: data2.sessionId, payload: { data: data2, metadata: meta, boundary: event2.boundary }, state: [{ key: sessionKey(data2.sessionId), expectedRevision: row2.revision, value: record2 }, { key: countKey(data2.sessionId), expectedRevision: count?.revision ?? null, value: { recordType: "cash-count", schemaVersion: 1, history: next } }], ledger: [], audit: [{ id: `cash-count-audit:${operationId}`, operationId, value: { sessionId: data2.sessionId, event: event2, policyVersion: meta.policyVersion } }], outbox: { id: `cash-count-outbox:${operationId}`, operationId, value: { sessionId: data2.sessionId, action } }, result: { sessionId: data2.sessionId, sessionRevision: row2.revision + 1, countRevision: (count?.revision ?? -1) + 1, event: event2 } };
}

// src/storage/cash-count-history.ts
var orderKinds = /* @__PURE__ */ new Set(["draft.create", "draft.update", "draft.cancel", "batch.confirm-first", "payment.draft-cash", "payment.confirmed-cash", "payment.multi-batch-cash", "payment.draft-noncash", "payment.confirmed-noncash", "settlement.draft-free", "settlement.confirmed-free", "serving.serve", "serving.correct", "payment.correct-method", "payment.adjust-closed-method", "refund.served", "refund.return-stock", "cancellation.paid", "refund.cancelled", "cancellation.refund-paid", "cancellation.return-stock", "cancellation.free", "return.free", "cancellation.unpaid", "return.unpaid"]);
var typed2 = (v) => v && typeof v === "object" && "recordType" in v ? v : void 0;
var stream = (c) => JSON.stringify([c.storeId, c.deviceId, c.deviceEpoch]);
function isCashCountChange(c) {
  return c.kind.startsWith("cash-count.") && c.state.some((s) => {
    const type = typed2(s.value)?.recordType;
    return type === "cash-count" || type === "cash-session";
  });
}
function prefix(receipts, boundary) {
  const limits = new Map(boundary.map((b) => [b.key, b.sequence]));
  const chosen = receipts.filter((r) => {
    const c = JSON.parse(r.payload);
    return c.localSequence <= (limits.get(stream(c)) ?? 0);
  });
  const versions = /* @__PURE__ */ new Map();
  const ledger = [], audit = [], outbox = [];
  for (const r of chosen) {
    const c = JSON.parse(r.payload);
    for (const s of c.state) {
      const revision2 = (s.expectedRevision ?? -1) + 1, old = versions.get(s.key);
      if (!old || old.revision < revision2) versions.set(s.key, { key: s.key, revision: revision2, value: s.value });
    }
    ledger.push(...c.ledger);
    audit.push(...c.audit);
    outbox.push(c.outbox);
  }
  const actual = /* @__PURE__ */ new Map();
  for (const r of chosen) {
    const c = JSON.parse(r.payload), k = stream(c);
    actual.set(k, (actual.get(k) ?? 0) + 1);
  }
  if (actual.size !== limits.size || [...limits].some(([k, n]) => actual.get(k) !== n)) throw new Error("Batas event tidak lengkap");
  return { schema: 1, state: [...versions.values()], ledger, audit, outbox, receipts: chosen, sequences: boundary };
}
function validateCashCountTransitions(receipts, byKey, edge) {
  const changes2 = receipts.map((r) => JSON.parse(r.payload));
  for (const c of changes2.filter(isCashCountChange)) {
    const action = c.kind.slice("cash-count.".length), p = c.payload;
    if (!p || !Array.isArray(p.boundary)) throw new Error("Batas hitungan hilang");
    const s = prefix(receipts, p.boundary);
    if (s.receipts.some((r) => r.id === c.operationId)) throw new Error("Batas mencakup dirinya sendiri");
    for (const r of receipts) {
      if (r.id === c.operationId) continue;
      const other = JSON.parse(r.payload);
      if (other.localSequence <= (new Map(p.boundary.map((b) => [b.key, b.sequence])).get(stream(other)) ?? 0)) edge(other.operationId, c.operationId);
      else edge(c.operationId, other.operationId);
    }
    if (canonical(c) !== canonical(makeCashCountChange(s, action, p.data, p.metadata))) throw new Error("Histori hitungan tidak sesuai sumber");
  }
  const opens = changes2.filter((c) => c.kind === "cash.open"), closes = new Map(changes2.filter((c) => c.kind === "cash-count.close" && isCashCountChange(c)).map((c) => [c.operationId, c]));
  const stores = /* @__PURE__ */ new Map();
  for (const c of opens) {
    const list = stores.get(c.storeId) ?? [];
    list.push(c);
    stores.set(c.storeId, list);
  }
  for (const list of stores.values()) {
    const used = /* @__PURE__ */ new Set(), roots = list.filter((c) => !c.payload.previousClose);
    if (roots.length !== 1) throw new Error("Rantai pembukaan sesi tidak sah");
    for (const c of list) {
      const previous = c.payload.previousClose;
      if (!previous) continue;
      const close = closes.get(previous);
      if (!close || close.storeId !== c.storeId || close.targetId === c.targetId || used.has(previous)) throw new Error("Sumber pembukaan sesi tidak sah");
      used.add(previous);
      edge(previous, c.operationId);
    }
    const reachable = /* @__PURE__ */ new Set();
    let current = roots[0];
    while (current) {
      if (reachable.has(current.operationId)) throw new Error("Siklus sesi");
      reachable.add(current.operationId);
      const close = [...closes.values()].find((c) => c.targetId === current.targetId && c.storeId === current.storeId);
      current = close ? list.find((o) => o.payload.previousClose === close.operationId) : void 0;
    }
    if (reachable.size !== list.length) throw new Error("Rantai sesi terputus");
  }
  for (const [key2, versions] of byKey) {
    if (!key2.startsWith("cash-session:")) continue;
    const counts = versions.filter((v) => isCashCountChange(v.change)).sort((a, b) => a.revision - b.revision);
    for (let i = 0; i < counts.length; i++) {
      const active = counts[i].change;
      if (active.kind !== "cash-count.save" && active.kind !== "cash-count.revise") continue;
      const boundary = new Map(active.payload.boundary.map((b) => [b.key, b.sequence]));
      const next = counts[i + 1]?.change, upper = next ? new Map(next.payload.boundary.map((b) => [b.key, b.sequence])) : void 0;
      for (const other of changes2) {
        if (other.operationId === active.operationId || other.operationId === next?.operationId || other.storeId !== active.storeId || !other.state.some((s) => !typed2(s.value))) continue;
        if (other.localSequence > (boundary.get(stream(other)) ?? 0) && (!upper || other.localSequence <= (upper.get(stream(other)) ?? 0))) throw new Error("Sumber generik berubah selama hitungan");
      }
    }
  }
  const states = /* @__PURE__ */ new Map();
  for (const [key2, versions] of byKey) {
    if (!key2.startsWith("cash-session:")) continue;
    const status = /* @__PURE__ */ new Map();
    let current = "open";
    for (const v of [...versions].sort((a, b) => a.revision - b.revision)) {
      const kind = v.change.kind;
      if (kind === "cash-count.save") {
        if (current !== "open") throw new Error("Sesi tidak tersedia");
        current = "counting";
      } else if (kind === "cash-count.revise") {
        if (current !== "counting") throw new Error("Hitungan tidak aktif");
      } else if (kind === "cash-count.cancel" || kind === "cash-count.handover") {
        if (current !== "counting") throw new Error("Hitungan tidak aktif");
        current = "open";
      } else if (kind === "cash-count.close") {
        if (current !== "counting") throw new Error("Hitungan tidak aktif");
        current = "closed";
      } else if (v.revision > 0 && current !== "open") throw new Error("Mutasi sesi ditahan");
      status.set(v.revision, current);
    }
    states.set(key2.slice("cash-session:".length), status);
  }
  for (const c of changes2.filter((c2) => orderKinds.has(c2.kind))) {
    const draft = typed2(byKey.get(`draft:${c.targetId}`)?.find((v) => v.revision === 0)?.value);
    if (draft?.recordType !== "draft") continue;
    if (c.kind === "payment.adjust-closed-method" || (c.kind === "refund.served" || c.kind === "refund.return-stock") && c.payload?.contractVersion === 3) {
      const p2 = c.payload;
      const origin = p2.sourceSession, execution = p2.sessionSource;
      if (!origin || !execution || origin.id !== draft.draft.cashSessionId || origin.id === execution.id || states.get(origin.id)?.get(origin.revision) !== "closed" || states.get(execution.id)?.get(execution.revision) !== "open") throw new Error("Sesi penyesuaian tidak sah");
      const old = byKey.get(`cash-session:${origin.id}`)?.find((v) => v.revision === origin.revision), current = byKey.get(`cash-session:${execution.id}`)?.find((v) => v.revision === execution.revision), next2 = byKey.get(`cash-session:${execution.id}`)?.find((v) => v.revision === execution.revision + 1);
      if (!old || old.change.kind !== "cash-count.close" || !current || old.change.storeId !== c.storeId || current.change.storeId !== c.storeId) throw new Error("Sumber sesi penyesuaian tidak sah");
      edge(old.change.operationId, c.operationId);
      edge(current.change.operationId, c.operationId);
      if (next2) edge(c.operationId, next2.change.operationId);
      continue;
    }
    const id8 = draft.draft.cashSessionId, versions = byKey.get(`cash-session:${id8}`) ?? [], p = c.payload;
    const touched = c.state.find((s) => s.key === `cash-session:${id8}`);
    const revision2 = touched?.expectedRevision ?? p?.sessionSource?.revision ?? p?.data?.expectedSessionRevision;
    if (revision2 === void 0 || revision2 === null) {
      const first = versions.filter((v) => v.change.kind.startsWith("cash-count.")).sort((a, b) => a.revision - b.revision)[0];
      if (first) edge(c.operationId, first.change.operationId);
      continue;
    }
    if (p?.sessionSource && p.sessionSource.id !== id8 || states.get(id8)?.get(revision2) !== "open") throw new Error("Mutasi pesanan pada sesi tidak tersedia");
    const source2 = versions.find((v) => v.revision === revision2), next = versions.find((v) => v.revision === revision2 + 1);
    if (!source2) throw new Error("Sumber sesi tidak ditemukan");
    edge(source2.change.operationId, c.operationId);
    if (next) edge(c.operationId, next.change.operationId);
  }
}

// src/storage/sku-stock-mappings.ts
var mappingKey = (storeId, skuId) => `sku-stock-mapping:${JSON.stringify([storeId, skuId])}`;

// src/storage/simple-catalog.ts
var catalogKey = (storeId) => `catalog:${storeId}`;
var uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
var exact = (v, keys) => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).sort().join(",") === [...keys].sort().join(",");
var nonnegative = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
function validateCategoryInput(v) {
  if (!exact(v, ["categoryId", "name", "expectedCatalogRevision"])) throw new Error("Kategori tidak sah");
  const x = v;
  if (!uuid4.test(x.categoryId) || typeof x.name !== "string" || x.name !== x.name.trim() || x.name.length < 1 || x.name.length > 40 || x.expectedCatalogRevision !== null && !nonnegative(x.expectedCatalogRevision)) throw new Error("Kategori tidak sah");
}
function validateMenuInput(v) {
  if (!exact(v, ["menuId", "skuId", "stockGroupId", "name", "categoryId", "price", "openingStock", "minimum", "expectedCatalogRevision"])) throw new Error("Menu tidak sah");
  const x = v;
  if (![x.menuId, x.skuId, x.stockGroupId, x.categoryId].every((i) => uuid4.test(i)) || (/* @__PURE__ */ new Set([x.menuId, x.skuId, x.stockGroupId])).size !== 3 || typeof x.name !== "string" || x.name !== x.name.trim() || x.name.length < 1 || x.name.length > 80 || !nonnegative(x.price) || x.price > 999999999 || !nonnegative(x.openingStock) || !nonnegative(x.minimum) || x.expectedCatalogRevision !== null && !nonnegative(x.expectedCatalogRevision)) throw new Error("Menu tidak sah");
}
function makeCatalogChange(catalog, revision2, data2, meta, recordedAt) {
  const menu = "menuId" in data2;
  const next = copyInput(catalog);
  let code;
  if (menu) {
    validateMenuInput(data2);
    if (!next.categories.some((c) => c.id === data2.categoryId) || next.menus.some((m) => m.id === data2.menuId || m.skuId === data2.skuId || m.stockGroupId === data2.stockGroupId)) throw new Error("Kategori atau menu tidak sah");
    code = nextSimpleCode(next);
    next.menus.push({ id: data2.menuId, skuId: data2.skuId, stockGroupId: data2.stockGroupId, name: data2.name, categoryId: data2.categoryId, code, typeLabel: "Normal", price: data2.price, active: true });
  } else {
    validateCategoryInput(data2);
    if (next.categories.some((c) => c.id === data2.categoryId || c.name.toLocaleLowerCase("id-ID") === data2.name.toLocaleLowerCase("id-ID"))) throw new Error("Kategori sudah ada");
    next.categories.push({ id: data2.categoryId, name: data2.name });
  }
  validateSimpleCatalog(next);
  const op = meta.operationId, stock = menu ? { groupId: data2.stockGroupId, storeId: meta.storeId, baseline: data2.openingStock, balance: data2.openingStock, minimum: data2.minimum } : null;
  const state = [{ key: catalogKey(meta.storeId), expectedRevision: revision2, value: { recordType: "simple-catalog", schemaVersion: 1, catalog: next } }];
  if (menu && stock) {
    state.push({ key: `stock-group:${data2.stockGroupId}`, expectedRevision: null, value: createStockGroupRecord(stock) }, { key: mappingKey(meta.storeId, data2.skuId), expectedRevision: null, value: createSkuStockMappingRecord({ storeId: meta.storeId, skuId: data2.skuId, groupId: data2.stockGroupId }) });
  }
  return { operationId: op, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: menu ? "catalog.simple-create" : "catalog.category-create", targetId: menu ? data2.menuId : data2.categoryId, payload: { contractVersion: 1, data: data2, metadata: meta, recordedAt }, state, ledger: menu && stock ? [{ id: `stock-ledger:${op}`, operationId: op, value: { action: "opening", groupId: stock.groupId, storeId: meta.storeId, delta: stock.balance, before: 0, after: stock.balance } }] : [], audit: [{ id: `catalog-audit:${op}`, operationId: op, value: { action: menu ? "simple-create" : "category-create", actorId: meta.actorId, policyVersion: meta.policyVersion, occurredAt: meta.recordedAt, recordedAt, before: catalog, after: next } }], outbox: { id: `catalog-outbox:${op}`, operationId: op, value: { storeId: meta.storeId } }, result: { id: menu ? data2.menuId : data2.categoryId, ...code ? { code } : {}, revision: (revision2 ?? -1) + 1 } };
}

// src/storage/draft-cancellation.ts
function makeDraftCancellationChange(draft, data2, metadata, sessionSource) {
  if (!data2 || Object.keys(data2).sort().join(",") !== "expectedRevision,orderId,reason" || data2.orderId !== draft.orderId) throw new Error("Intent pembatalan tidak sah");
  draftDateCode(metadata.recordedAt, metadata.storeTimeZone);
  const event2 = { orderId: data2.orderId, reason: data2.reason, recordedAt: metadata.recordedAt, operationId: metadata.operationId, actorId: metadata.actorId, policyVersion: metadata.policyVersion, draftRevision: data2.expectedRevision };
  validateDraftCancellation(event2);
  const operationId = metadata.operationId;
  return { operationId, storeId: metadata.storeId, deviceId: metadata.deviceId, deviceEpoch: metadata.deviceEpoch, localSequence: metadata.localSequence, actorId: metadata.actorId, policyVersion: metadata.policyVersion, kind: "draft.cancel", targetId: data2.orderId, payload: { data: data2, metadata, contractVersion: 2, sessionSource }, state: [{ key: `draft-cancellation:${data2.orderId}`, expectedRevision: null, value: { recordType: "draft-cancellation", schemaVersion: 1, cancellation: event2 } }], ledger: [], audit: [{ id: `draft-cancel-audit:${operationId}`, operationId, value: { action: "cancel", event: event2, draft } }], outbox: { id: `draft-cancel-outbox:${operationId}`, operationId, value: { orderId: data2.orderId } }, result: { orderId: data2.orderId, cancellation: event2 } };
}

// src/storage/served-refunds.ts
var refundKey = (orderId) => `served-refunds:${orderId}`;
var returnKey = (orderId) => `stock-returns:${orderId}`;
var validRevision = (n, nullable = false) => nullable && n === null || typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
var text3 = (s, max = 500) => typeof s === "string" && !!s.trim() && s.length <= max;
function history(refunds) {
  return refunds.map((r) => ({ unitIds: r.units.map((u) => u.id), amount: r.amount, source: "payment" }));
}
function sourceChecks(s, orderId, meta) {
  if (!s || s.batch.draft.orderId !== orderId || s.payment.orderId !== orderId || s.batch.storeId !== meta.storeId || s.session.storeId !== meta.storeId || (s.originSession ? s.originSession.id !== s.payment.cashSessionId || s.originSession.storeId !== meta.storeId || s.session.id === s.originSession.id || s.batch.draft.channel !== "store" : s.session.id !== s.payment.cashSessionId) || !Array.isArray(s.refunds) || !Array.isArray(s.returns) || !Array.isArray(s.groups)) throw new Error("Sumber refund tidak sah");
  for (const r of s.refunds) {
    validateServedRefundEvent(r);
    if (r.orderId !== orderId || r.storeId !== meta.storeId || r.paymentId !== s.payment.id) throw new Error("Histori refund asing");
  }
  for (const r of s.returns) {
    validateStockReturnEvent(r, true);
    if (r.orderId !== orderId || r.storeId !== meta.storeId || r.paymentId !== s.payment.id) throw new Error("Histori return asing");
  }
}
function returnEffects(s, source2, unitIds, option, meta) {
  const { units, state, groupIds } = planStockReturn(s.batch, s.returns.flatMap((r) => r.units.map((u) => u.id)), s.groups, source2.units.map((u) => u.id), unitIds, option, meta, s.returns.length);
  const event2 = { id: `return:${meta.operationId}`, ..."kitchenConfirmed" in source2 ? { cancellationId: source2.id } : { refundId: source2.id }, paymentId: source2.paymentId, orderId: source2.orderId, storeId: source2.storeId, units, reason: option.reason, actorId: meta.actorId, recordedAt: meta.recordedAt, sellable: true };
  validateStockReturnEvent(event2, true);
  const ledger = groupIds.map((groupId) => ({ id: `return-ledger:${meta.operationId}:${groupId}`, operationId: meta.operationId, value: { kind: "stock-return", event: event2, groupId, delta: units.filter((u) => u.groupId === groupId).length } }));
  return { event: event2, state, ledger };
}
function planStockReturn(batch, alreadyReturned, groups, eligibleIds, unitIds, option, meta, returnCount) {
  if (!option || Object.keys(option).sort().join(",") !== "expectedReturnRevision,groups,reason,sellable" || option.sellable !== true || !text3(option.reason) || !validRevision(option.expectedReturnRevision, true) || option.expectedReturnRevision !== (returnCount ? returnCount - 1 : null) || !Array.isArray(unitIds) || !unitIds.length || unitIds.some((id8) => !text3(id8, 200)) || new Set(unitIds).size !== unitIds.length || !Array.isArray(option.groups)) throw new Error("Pilihan return tidak sah");
  const already = new Set(alreadyReturned), eligible = new Set(eligibleIds);
  const units = unitIds.map((id8) => {
    if (!eligible.has(id8) || already.has(id8)) throw new Error("Unit return tidak tersedia");
    const item = batch.draft.items.find((i) => i.unitIds.includes(id8)), mapping = batch.skuGroups.find((m) => m.skuId === item?.skuId);
    if (!item || !mapping) throw new Error("Grup asal tidak ditemukan");
    return { id: id8, groupId: mapping.groupId };
  });
  const groupIds = [...new Set(units.map((u) => u.groupId))].sort();
  if (option.groups.length !== groupIds.length || groups.length !== groupIds.length || new Set(option.groups.map((g) => g.groupId)).size !== groupIds.length) throw new Error("Sumber grup return tidak lengkap");
  const state = groupIds.map((groupId) => {
    const source2 = option.groups.find((g) => g.groupId === groupId), group = groups.find((g) => g.groupId === groupId), qty = units.filter((u) => u.groupId === groupId).length;
    if (!source2 || Object.keys(source2).sort().join(",") !== "balance,groupId,revision" || !validRevision(source2.revision) || !Number.isSafeInteger(source2.balance) || !group || group.storeId !== meta.storeId || source2.balance !== group.balance || !Number.isSafeInteger(group.balance + qty)) throw new Error("Sumber grup return berubah");
    return { key: `stock-group:${groupId}`, expectedRevision: source2.revision, value: { recordType: "stock-group", schemaVersion: 1, stockGroup: { ...group, balance: group.balance + qty } } };
  });
  return { units, state, groupIds };
}
function makeServedRefundChange(s, data2, meta) {
  const postClose = !!s.originSession;
  if (!data2 || Object.keys(data2).sort().join(",") !== (postClose ? "executionSessionId,expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,expectedSourceRevision,method,moneyReturned,orderId,reason,returnStock,selection,sourceSessionId" : "expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,method,moneyReturned,orderId,reason,returnStock,selection") || postClose && (data2.sourceSessionId !== s.originSession.id || data2.executionSessionId !== s.session.id || data2.expectedSourceRevision !== s.originRevision || !validRevision(data2.expectedSourceRevision)) || !text3(data2.orderId, 200) || !validRevision(data2.expectedRefundRevision, true) || !validRevision(data2.expectedServingRevision) || !validRevision(data2.expectedCorrectionRevision, true) || !validRevision(data2.expectedSessionRevision) || !text3(data2.reason) || data2.moneyReturned !== true || !(data2.method === null || ["cash", "qris", "transfer", "ewallet"].includes(data2.method))) throw new Error("Intent refund tidak sah");
  sourceChecks(s, data2.orderId, meta);
  if (data2.expectedRefundRevision !== (s.refunds.length ? s.refunds.length - 1 : null) || data2.expectedCorrectionRevision !== (s.corrections.length ? s.corrections.length - 1 : null)) throw new Error("Revisi histori berubah");
  const selected = planServedRefund(s.batch, s.payment, s.settlement, s.serving, history(s.refunds), data2.selection), method = data2.method ?? effectivePaymentMethod(s.payment, s.corrections);
  const event2 = { id: `refund:${meta.operationId}`, paymentId: s.payment.id, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: s.session.id, units: selected.unitIds.map((id8) => ({ id: id8, amount: s.settlement.totals.allocations.find((a) => a.id === id8).total })), amount: selected.amount, method, reason: data2.reason, actorId: meta.actorId, recordedAt: meta.recordedAt, moneyReturned: true };
  validateServedRefundEvent(event2);
  const balance = s.before - (method === "cash" ? event2.amount : 0);
  if (!Number.isSafeInteger(s.before) || s.before < 0 || !Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak cukup");
  const ret = data2.returnStock === null ? null : returnEffects(s, event2, event2.units.map((u) => u.id), data2.returnStock, meta), operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "refund.served", targetId: data2.orderId, payload: { data: data2, metadata: meta, contractVersion: postClose ? 3 : s.refundSchemaVersion === 2 || data2.returnStock !== null && s.returns.some((r) => "cancellationId" in r) ? 2 : 1, ...postClose ? { sourceSession: { id: s.originSession.id, revision: s.originRevision }, sessionSource: { id: s.session.id, revision: data2.expectedSessionRevision } } : {} }, state: [{ key: refundKey(data2.orderId), expectedRevision: data2.expectedRefundRevision, value: { recordType: "served-refunds", schemaVersion: s.refundSchemaVersion === 2 ? 2 : 1, refunds: [...s.refunds, event2] } }, { key: `cash-session:${s.session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session: s.session } }, ...ret ? [{ key: returnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: s.returns.some((r) => "cancellationId" in r) ? 2 : 1, returns: [...s.returns, ret.event] } }, ...ret.state] : []], ledger: [{ id: `refund-ledger:${operationId}`, operationId, value: { kind: "refund", sessionId: s.session.id, storeId: meta.storeId, refund: event2 } }, ...ret?.ledger ?? []], audit: [{ id: `refund-audit:${operationId}`, operationId, value: { refund: event2, stockReturn: ret?.event ?? null, before: s.before, after: balance, policyVersion: meta.policyVersion } }], outbox: { id: `refund-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, paymentId: s.payment.id } }, result: { refund: event2, stockReturn: ret?.event ?? null, balance, sessionRevision: data2.expectedSessionRevision + 1, refundRevision: s.refunds.length } };
}
function makeStockReturnChange(s, data2, meta, forceSessionSource = false) {
  const postClose = !!s.originSession;
  if (!data2 || Object.keys(data2).sort().join(",") !== (postClose ? "executionSessionId,expectedRefundRevision,expectedReturnRevision,expectedSessionRevision,expectedSourceRevision,groups,orderId,reason,refundId,sellable,sourceSessionId,unitIds" : "expectedRefundRevision,expectedReturnRevision,groups,orderId,reason,refundId,sellable,unitIds") || postClose && (data2.sourceSessionId !== s.originSession.id || data2.executionSessionId !== s.session.id || data2.expectedSourceRevision !== s.originRevision || data2.expectedSessionRevision !== s.sessionRevision || !validRevision(data2.expectedSourceRevision) || !validRevision(data2.expectedSessionRevision)) || !text3(data2.orderId, 200) || !text3(data2.refundId, 200) || !validRevision(data2.expectedRefundRevision) || data2.expectedRefundRevision !== s.refunds.length - 1) throw new Error("Intent return tidak sah");
  sourceChecks(s, data2.orderId, meta);
  const refund2 = s.refunds.find((r) => r.id === data2.refundId);
  if (!refund2) throw new Error("Refund asal tidak ditemukan");
  const ret = returnEffects(s, refund2, data2.unitIds, { reason: data2.reason, sellable: data2.sellable, expectedReturnRevision: data2.expectedReturnRevision, groups: data2.groups }, meta), operationId = meta.operationId;
  const contractVersion = postClose ? 3 : forceSessionSource || s.refundSchemaVersion === 2 || s.returns.some((r) => "cancellationId" in r) ? 2 : 1;
  if (contractVersion >= 2 && !validRevision(s.sessionRevision)) throw new Error("Revisi sesi return tidak sah");
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "refund.return-stock", targetId: data2.orderId, payload: contractVersion >= 2 ? { data: data2, metadata: meta, contractVersion, sessionSource: { id: s.session.id, revision: s.sessionRevision }, ...postClose ? { sourceSession: { id: s.originSession.id, revision: s.originRevision } } : {} } : { data: data2, metadata: meta, contractVersion }, state: [{ key: returnKey(data2.orderId), expectedRevision: data2.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: s.returns.some((r) => "cancellationId" in r) ? 2 : 1, returns: [...s.returns, ret.event] } }, ...ret.state], ledger: ret.ledger, audit: [{ id: `return-audit:${operationId}`, operationId, value: { stockReturn: ret.event, policyVersion: meta.policyVersion } }], outbox: { id: `return-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, refundId: refund2.id } }, result: { stockReturn: ret.event, returnRevision: s.returns.length } };
}

// src/storage/unpaid-cancellations.ts
var unpaidCancellationKey = (orderId) => `unpaid-cancellation:${orderId}`;
var unpaidReturnKey = (orderId) => `unpaid-stock-returns:${orderId}`;
var text4 = (v, max = 200) => typeof v === "string" && !!v.trim() && v.length <= max;
var rev = (v, nullable = false) => nullable && v === null || typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER;
function checkSources(s, orderId, meta, servingRevision) {
  validateFirstBatch(s.batch);
  if (s.batch.storeId !== meta.storeId || s.batch.draft.orderId !== orderId || s.session.storeId !== meta.storeId || s.session.id !== s.batch.draft.cashSessionId || !Array.isArray(s.returns) || !Array.isArray(s.groups) || !rev(servingRevision, true) || s.serving === null !== (servingRevision === null)) throw new Error("Sumber unpaid tidak sesuai");
  const initial = initialServing(s.batch), serving2 = s.serving ?? initial;
  validateServingState(serving2, true);
  if (serving2.orderId !== initial.orderId || serving2.storeId !== initial.storeId || serving2.cashSessionId !== initial.cashSessionId || canonical(serving2.units.map((u) => u.id)) !== canonical(initial.units.map((u) => u.id))) throw new Error("Unit penyajian tidak sesuai");
  if (s.cancellation) {
    validateUnpaidCancellation(s.cancellation);
    if (s.cancellation.orderId !== orderId || s.cancellation.storeId !== meta.storeId || s.cancellation.cashSessionId !== s.session.id || canonical(s.cancellation.unitIds) !== canonical(initial.units.map((u) => u.id)) || serving2.units.some((u) => u.status !== "cancelled")) throw new Error("Pembatalan unpaid tidak sesuai");
  } else if (s.returns.length) throw new Error("Return tanpa pembatalan");
  const returned = /* @__PURE__ */ new Set();
  for (const event2 of s.returns) {
    validateUnpaidReturn(event2);
    if (event2.orderId !== orderId || event2.storeId !== meta.storeId || event2.cashSessionId !== s.session.id || event2.cancellationId !== s.cancellation?.id) throw new Error("Return asing");
    for (const unit of event2.units) {
      const item = s.batch.draft.items.find((i) => i.unitIds.includes(unit.id));
      if (returned.has(unit.id) || !item || s.batch.skuGroups.find((m) => m.skuId === item.skuId)?.groupId !== unit.groupId) throw new Error("Return duplikat atau grup berbeda");
      returned.add(unit.id);
    }
  }
  return serving2;
}
function returnEffects2(s, cancellation, unitIds, option, meta) {
  const plan = planStockReturn(s.batch, s.returns.flatMap((r) => r.units.map((u) => u.id)), s.groups, cancellation.unitIds, unitIds, option, meta, s.returns.length);
  const event2 = { id: `unpaid-return:${meta.operationId}`, cancellationId: cancellation.id, orderId: cancellation.orderId, storeId: meta.storeId, cashSessionId: s.session.id, units: plan.units, reason: option.reason, sellable: true, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateUnpaidReturn(event2);
  return { event: event2, state: plan.state, ledger: plan.groupIds.map((groupId) => ({ id: `unpaid-return-ledger:${meta.operationId}:${groupId}`, operationId: meta.operationId, value: { kind: "stock-return", event: event2, groupId, delta: plan.units.filter((u) => u.groupId === groupId).length } })) };
}
function envelope(meta, kind, orderId) {
  return { operationId: meta.operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind, targetId: orderId };
}
function makeUnpaidCancellationChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedBatchRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock" || !text4(data2.orderId) || !text4(data2.reason, 500) || data2.kitchenConfirmed !== true || data2.expectedBatchRevision !== 0 || !rev(data2.expectedSessionRevision)) throw new Error("Intent pembatalan unpaid tidak sah");
  const before = checkSources(s, data2.orderId, meta, data2.expectedServingRevision);
  if (s.cancellation || s.returns.length || before.units.some((u) => u.status !== "processed")) throw new Error("Batch tidak dapat dibatalkan");
  const event2 = { id: `unpaid-cancel:${meta.operationId}`, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: s.session.id, unitIds: before.units.map((u) => u.id), reason: data2.reason, kitchenConfirmed: true, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateUnpaidCancellation(event2);
  const after = { ...before, units: before.units.map((u) => ({ ...u, status: "cancelled" })) };
  let ret = null;
  if (data2.returnStock !== null) {
    const option = data2.returnStock;
    if (!option || Object.keys(option).sort().join(",") !== "expectedReturnRevision,groups,reason,sellable,unitIds") throw new Error("Opsi return tidak sah");
    ret = returnEffects2(s, event2, option.unitIds, { reason: option.reason, sellable: option.sellable, expectedReturnRevision: option.expectedReturnRevision, groups: option.groups }, meta);
  }
  return { ...envelope(meta, "cancellation.unpaid", data2.orderId), payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: unpaidCancellationKey(data2.orderId), expectedRevision: null, value: { recordType: "unpaid-cancellation", schemaVersion: 1, cancellation: event2 } }, { key: `serving:${data2.orderId}`, expectedRevision: data2.expectedServingRevision, value: { recordType: "serving", schemaVersion: 2, serving: after } }, ...ret ? [{ key: unpaidReturnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "unpaid-stock-returns", schemaVersion: 1, returns: [ret.event] } }, ...ret.state] : []], ledger: ret?.ledger ?? [], audit: [{ id: `unpaid-cancel-audit:${meta.operationId}`, operationId: meta.operationId, value: { cancellation: event2, stockReturn: ret?.event ?? null, before, after, policyVersion: meta.policyVersion } }], outbox: { id: `unpaid-cancel-outbox:${meta.operationId}`, operationId: meta.operationId, value: { orderId: data2.orderId } }, result: { cancellation: event2, stockReturn: ret?.event ?? null, serving: after, cancellationRevision: 0, servingRevision: (data2.expectedServingRevision ?? -1) + 1, returnRevision: ret ? 0 : null } };
}
function makeUnpaidReturnChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedBatchRevision,expectedCancellationRevision,expectedReturnRevision,expectedServingRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds" || !text4(data2.orderId) || data2.expectedBatchRevision !== 0 || data2.expectedCancellationRevision !== 0 || !rev(data2.expectedServingRevision) || !rev(data2.expectedSessionRevision)) throw new Error("Intent return unpaid tidak sah");
  checkSources(s, data2.orderId, meta, data2.expectedServingRevision);
  if (!s.cancellation) throw new Error("Pembatalan asal tidak ditemukan");
  const ret = returnEffects2(s, s.cancellation, data2.unitIds, { reason: data2.reason, sellable: data2.sellable, expectedReturnRevision: data2.expectedReturnRevision, groups: data2.groups }, meta);
  return { ...envelope(meta, "return.unpaid", data2.orderId), payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: unpaidReturnKey(data2.orderId), expectedRevision: data2.expectedReturnRevision, value: { recordType: "unpaid-stock-returns", schemaVersion: 1, returns: [...s.returns, ret.event] } }, ...ret.state], ledger: ret.ledger, audit: [{ id: `unpaid-return-audit:${meta.operationId}`, operationId: meta.operationId, value: { stockReturn: ret.event, policyVersion: meta.policyVersion } }], outbox: { id: `unpaid-return-outbox:${meta.operationId}`, operationId: meta.operationId, value: { orderId: data2.orderId } }, result: { stockReturn: ret.event, returnRevision: s.returns.length } };
}

// src/storage/paid-cancellations.ts
var cancellationKey = (orderId) => `paid-cancellations:${orderId}`;
var validRevision2 = (n, nullable = false) => nullable && n === null || typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
var text5 = (v, max = 200) => typeof v === "string" && !!v.trim() && v.length <= max;
function makePaidCancellationChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedCancellationRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock,selection" || !text5(data2.orderId) || !text5(data2.reason, 500) || data2.kitchenConfirmed !== true || !validRevision2(data2.expectedServingRevision, true) || !validRevision2(data2.expectedCancellationRevision, true) || !validRevision2(data2.expectedRefundRevision, true) || !validRevision2(data2.expectedSessionRevision)) throw new Error("Intent pembatalan tidak sah");
  if (!s || !Array.isArray(s.cancellations) || !Array.isArray(s.refunds) || data2.expectedCancellationRevision !== (s.cancellations.length ? s.cancellations.length - 1 : null) || data2.expectedRefundRevision !== (s.refunds.length ? s.refunds.length - 1 : null) || s.serving === null !== (data2.expectedServingRevision === null) || s.batch.storeId !== meta.storeId || s.session.storeId !== meta.storeId || s.session.id !== s.payment.cashSessionId || s.payment.orderId !== data2.orderId) throw new Error("Sumber pembatalan tidak sah");
  for (const event3 of s.cancellations) {
    validatePaidCancellationEvent(event3);
    if (event3.orderId !== data2.orderId || event3.paymentId !== s.payment.id || event3.storeId !== meta.storeId || event3.cashSessionId !== s.session.id) throw new Error("Histori pembatalan asing");
  }
  const serving2 = s.serving ?? initialServing(s.batch), refundHistory = s.refunds.map((r) => ({ unitIds: r.units.map((u) => u.id), amount: r.amount, source: "payment" }));
  const plan = planPaidCancellation(s.batch, s.payment, s.settlement, serving2, refundHistory, s.cancellations.flatMap((c) => c.units.map((u) => u.id)), data2.selection);
  const event2 = { id: `cancel:${meta.operationId}`, paymentId: s.payment.id, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: s.session.id, units: plan.units, reason: data2.reason, kitchenConfirmed: true, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validatePaidCancellationEvent(event2);
  const selected = new Set(plan.units.map((unit) => unit.id));
  const next = { ...serving2, units: serving2.units.map((unit) => selected.has(unit.id) ? { ...unit, status: "cancelled" } : unit) };
  const cancellations = [...s.cancellations, event2], due = paidRefundDue(cancellations, refundHistory), operationId = meta.operationId;
  const ret = data2.returnStock === null ? null : returnEffects(s, event2, event2.units.map((u) => u.id), data2.returnStock, meta);
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "cancellation.paid", targetId: data2.orderId, payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: cancellationKey(data2.orderId), expectedRevision: data2.expectedCancellationRevision, value: { recordType: "paid-cancellations", schemaVersion: 1, cancellations } }, { key: `serving:${data2.orderId}`, expectedRevision: data2.expectedServingRevision, value: { recordType: "serving", schemaVersion: 2, serving: next } }, ...ret ? [{ key: returnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: 2, returns: [...s.returns, ret.event] } }, ...ret.state] : []], ledger: ret?.ledger ?? [], audit: [{ id: `cancellation-audit:${operationId}`, operationId, value: { cancellation: event2, stockReturn: ret?.event ?? null, before: serving2, after: next, refundDue: due, policyVersion: meta.policyVersion } }], outbox: { id: `cancellation-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, paymentId: s.payment.id } }, result: { cancellation: event2, stockReturn: ret?.event ?? null, serving: next, refundDue: due, cancellationRevision: s.cancellations.length, servingRevision: (data2.expectedServingRevision ?? -1) + 1 } };
}
function makeRefundDueChange(s, data2, meta, eligibleIds) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedCancellationRevision,expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,method,moneyReturned,orderId,reason,returnStock,selection" || !text5(data2.orderId) || !text5(data2.reason, 500) || data2.moneyReturned !== true || !validRevision2(data2.expectedServingRevision) || !validRevision2(data2.expectedCancellationRevision) || !validRevision2(data2.expectedRefundRevision, true) || !validRevision2(data2.expectedCorrectionRevision, true) || !validRevision2(data2.expectedSessionRevision) || !(data2.method === null || ["cash", "qris", "transfer", "ewallet"].includes(data2.method))) throw new Error("Intent pelunasan refund tidak sah");
  if (!s || !s.serving || !Array.isArray(s.cancellations) || !Array.isArray(s.refunds) || !Array.isArray(s.corrections) || data2.expectedCancellationRevision !== s.cancellations.length - 1 || data2.expectedRefundRevision !== (s.refunds.length ? s.refunds.length - 1 : null) || data2.expectedCorrectionRevision !== (s.corrections.length ? s.corrections.length - 1 : null) || s.batch.storeId !== meta.storeId || s.payment.storeId !== meta.storeId || s.session.storeId !== meta.storeId || s.session.id !== s.payment.cashSessionId || s.payment.orderId !== data2.orderId) throw new Error("Sumber pelunasan refund tidak sah");
  const cancelled = /* @__PURE__ */ new Set();
  for (const event3 of s.cancellations) {
    validatePaidCancellationEvent(event3);
    if (event3.orderId !== data2.orderId || event3.paymentId !== s.payment.id || event3.storeId !== meta.storeId || event3.cashSessionId !== s.session.id) throw new Error("Histori pembatalan asing");
    for (const unit of event3.units) {
      if (cancelled.has(unit.id) || s.settlement.totals.allocations.find((a) => a.id === unit.id)?.total !== unit.amount || !s.serving.units.some((u) => u.id === unit.id && u.status === "cancelled")) throw new Error("Histori pembatalan tidak sesuai");
      cancelled.add(unit.id);
    }
  }
  if (s.serving.units.some((u) => u.status === "cancelled" && !cancelled.has(u.id))) throw new Error("Unit batal tanpa histori");
  const history2 = s.refunds.map((r) => ({ unitIds: r.units.map((u) => u.id), amount: r.amount, source: "payment" }));
  const selected = planServedRefund(s.batch, s.payment, s.settlement, { ...s.serving, units: s.serving.units.map((u) => ({ ...u, status: u.status === "cancelled" && (!eligibleIds || eligibleIds.has(u.id)) ? "served" : "processed" })) }, history2, data2.selection);
  const method = data2.method ?? effectivePaymentMethod(s.payment, s.corrections);
  const event2 = { id: `refund:${meta.operationId}`, paymentId: s.payment.id, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: s.session.id, units: selected.unitIds.map((id8) => ({ id: id8, amount: s.settlement.totals.allocations.find((a) => a.id === id8).total })), amount: selected.amount, method, reason: data2.reason, actorId: meta.actorId, recordedAt: meta.recordedAt, moneyReturned: true };
  validateServedRefundEvent(event2);
  const balance = s.before - (method === "cash" ? event2.amount : 0);
  if (!Number.isSafeInteger(s.before) || s.before < 0 || !Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak cukup");
  const ret = data2.returnStock === null ? null : returnEffects(s, event2, event2.units.map((u) => u.id), data2.returnStock, meta), operationId = meta.operationId;
  const due = paidRefundDue(s.cancellations, [...history2, { unitIds: event2.units.map((u) => u.id), amount: event2.amount, source: "payment" }]);
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "refund.cancelled", targetId: data2.orderId, payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: refundKey(data2.orderId), expectedRevision: data2.expectedRefundRevision, value: { recordType: "served-refunds", schemaVersion: 2, refunds: [...s.refunds, event2] } }, { key: `cash-session:${s.session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session: s.session } }, ...ret ? [{ key: returnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: s.returns.some((r) => "cancellationId" in r) ? 2 : 1, returns: [...s.returns, ret.event] } }, ...ret.state] : []], ledger: [{ id: `refund-ledger:${operationId}`, operationId, value: { kind: "refund", sessionId: s.session.id, storeId: meta.storeId, refund: event2 } }, ...ret?.ledger ?? []], audit: [{ id: `refund-audit:${operationId}`, operationId, value: { refund: event2, stockReturn: ret?.event ?? null, before: s.before, after: balance, refundDue: due, policyVersion: meta.policyVersion } }], outbox: { id: `refund-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, paymentId: s.payment.id } }, result: { refund: event2, stockReturn: ret?.event ?? null, refundDue: due, balance, sessionRevision: data2.expectedSessionRevision + 1, refundRevision: s.refunds.length } };
}
function makeCancelRefundChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedCancellationRevision,expectedCorrectionRevision,expectedRefundRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,method,moneyReturned,orderId,reason,returnStock,selection" || data2.moneyReturned !== true || !validRevision2(data2.expectedCorrectionRevision, true) || !(data2.method === null || ["cash", "qris", "transfer", "ewallet"].includes(data2.method))) throw new Error("Intent batal dan refund tidak sah");
  const base = { orderId: data2.orderId, expectedServingRevision: data2.expectedServingRevision, expectedCancellationRevision: data2.expectedCancellationRevision, expectedRefundRevision: data2.expectedRefundRevision, expectedSessionRevision: data2.expectedSessionRevision, selection: data2.selection, reason: data2.reason, kitchenConfirmed: data2.kitchenConfirmed, returnStock: null };
  const cancellation = makePaidCancellationChange(s, base, meta), result = cancellation.result;
  if (data2.expectedCorrectionRevision !== (s.corrections.length ? s.corrections.length - 1 : null)) throw new Error("Revisi koreksi berubah");
  const selections2 = s.batch.draft.items.map((item) => ({ itemId: item.id, quantity: result.cancellation.units.filter((u) => u.amount > 0 && item.unitIds.includes(u.id)).length })).filter((item) => item.quantity > 0);
  let monetary = null;
  if (selections2.length) {
    const d = { orderId: data2.orderId, expectedServingRevision: (data2.expectedServingRevision ?? -1) + 1, expectedCancellationRevision: s.cancellations.length, expectedRefundRevision: data2.expectedRefundRevision, expectedCorrectionRevision: data2.expectedCorrectionRevision, expectedSessionRevision: data2.expectedSessionRevision, selection: selections2, method: data2.method, reason: data2.reason, moneyReturned: true, returnStock: null };
    monetary = makeRefundDueChange({ ...s, serving: result.serving, cancellations: [...s.cancellations, result.cancellation] }, d, meta, new Set(result.cancellation.units.map((u) => u.id)));
  }
  const ret = data2.returnStock === null ? null : returnEffects(s, result.cancellation, result.cancellation.units.map((u) => u.id), data2.returnStock, meta), operationId = meta.operationId;
  const mr = monetary?.result;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "cancellation.refund-paid", targetId: data2.orderId, payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [...cancellation.state, ...monetary?.state ?? [], ...ret ? [{ key: returnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: 2, returns: [...s.returns, ret.event] } }, ...ret.state] : []], ledger: [...monetary?.ledger ?? [], ...ret?.ledger ?? []], audit: [...cancellation.audit, ...monetary?.audit ?? [], ...ret ? [{ id: `return-audit:${operationId}`, operationId, value: { stockReturn: ret.event, policyVersion: meta.policyVersion } }] : []], outbox: { id: `cancellation-refund-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, paymentId: s.payment.id } }, result: { cancellation: result.cancellation, refund: mr?.refund ?? null, stockReturn: ret?.event ?? null, serving: result.serving, refundDue: mr?.refundDue ?? result.refundDue, balance: mr?.balance ?? s.before, sessionRevision: mr?.sessionRevision ?? data2.expectedSessionRevision, refundRevision: mr?.refundRevision ?? data2.expectedRefundRevision, cancellationRevision: s.cancellations.length, servingRevision: (data2.expectedServingRevision ?? -1) + 1 } };
}
function makeCancelledReturnChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "cancellationId,expectedCancellationRevision,expectedReturnRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds" || !text5(data2.orderId) || !text5(data2.cancellationId) || !validRevision2(data2.expectedCancellationRevision) || !validRevision2(data2.expectedSessionRevision) || data2.expectedCancellationRevision !== s.cancellations.length - 1 || s.payment.orderId !== data2.orderId || s.payment.storeId !== meta.storeId || s.batch.storeId !== meta.storeId || s.session.storeId !== meta.storeId || s.session.id !== s.payment.cashSessionId) throw new Error("Intent return pembatalan tidak sah");
  const source2 = s.cancellations.find((c) => c.id === data2.cancellationId);
  validatePaidCancellationEvent(source2);
  if (source2.orderId !== data2.orderId || source2.storeId !== meta.storeId || source2.paymentId !== s.payment.id || source2.cashSessionId !== s.session.id) throw new Error("Sumber pembatalan tidak sah");
  const ret = returnEffects(s, source2, data2.unitIds, { reason: data2.reason, sellable: data2.sellable, expectedReturnRevision: data2.expectedReturnRevision, groups: data2.groups }, meta), operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "cancellation.return-stock", targetId: data2.orderId, payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: returnKey(data2.orderId), expectedRevision: data2.expectedReturnRevision, value: { recordType: "stock-returns", schemaVersion: 2, returns: [...s.returns, ret.event] } }, ...ret.state], ledger: ret.ledger, audit: [{ id: `return-audit:${operationId}`, operationId, value: { stockReturn: ret.event, policyVersion: meta.policyVersion } }], outbox: { id: `return-outbox:${operationId}`, operationId, value: { orderId: data2.orderId, cancellationId: source2.id } }, result: { stockReturn: ret.event, returnRevision: s.returns.length } };
}

// src/storage/free-cancellations.ts
var freeCancellationKey = (orderId) => `free-cancellations:${orderId}`;
var freeReturnKey = (orderId) => `free-stock-returns:${orderId}`;
var text6 = (v, max = 200) => typeof v === "string" && !!v.trim() && v.length <= max;
var revision = (v, nullable = false) => nullable && v === null || typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v < Number.MAX_SAFE_INTEGER;
var revOf = (length) => length ? length - 1 : null;
function sourceChecks2(s, orderId, meta, servingRevision, cancellationRevision) {
  if (!s || !Array.isArray(s.cancellations) || !Array.isArray(s.returns) || !Array.isArray(s.groups) || !revision(servingRevision, true) || !revision(cancellationRevision, true) || cancellationRevision !== revOf(s.cancellations.length) || s.serving === null !== (servingRevision === null) || s.batch.storeId !== meta.storeId || s.batch.draft.orderId !== orderId || s.session.storeId !== meta.storeId || s.session.id !== s.batch.draft.cashSessionId) throw new Error("Sumber gratis tidak sesuai");
  const serving2 = s.serving ?? initialServing(s.batch);
  validateFreeSources(s.batch, s.settlement, serving2);
  const cancelled = /* @__PURE__ */ new Set();
  for (const c of s.cancellations) {
    validateFreeCancellationEvent(c);
    if (c.storeId !== meta.storeId || c.orderId !== orderId || c.cashSessionId !== s.session.id || c.settlementId !== `settlement:${orderId}`) throw new Error("Histori pembatalan asing");
    for (const id8 of c.unitIds) {
      if (cancelled.has(id8) || !serving2.units.some((u) => u.id === id8 && u.status === "cancelled")) throw new Error("Histori pembatalan tidak sesuai");
      cancelled.add(id8);
    }
  }
  if (serving2.units.some((u) => u.status === "cancelled" && !cancelled.has(u.id))) throw new Error("Unit batal tanpa histori");
  const returned = /* @__PURE__ */ new Set();
  for (const r of s.returns) {
    validateFreeStockReturnEvent(r);
    if (r.storeId !== meta.storeId || r.orderId !== orderId || r.cashSessionId !== s.session.id || r.settlementId !== `settlement:${orderId}`) throw new Error("Histori return asing");
    for (const u of r.units) {
      if (returned.has(u.id)) throw new Error("Return duplikat");
      returned.add(u.id);
    }
  }
  return serving2;
}
function returnEffects3(s, unitIds, eligible, option, meta, source2, cancellationId) {
  const { units, state, groupIds } = planStockReturn(s.batch, s.returns.flatMap((r) => r.units.map((u) => u.id)), s.groups, eligible, unitIds, option, meta, s.returns.length);
  const event2 = { id: `free-return:${meta.operationId}`, settlementId: `settlement:${s.batch.draft.orderId}`, orderId: s.batch.draft.orderId, storeId: meta.storeId, cashSessionId: s.session.id, source: source2, cancellationId, units, reason: option.reason, sellable: true, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateFreeStockReturnEvent(event2);
  const ledger = groupIds.map((groupId) => ({ id: `free-return-ledger:${meta.operationId}:${groupId}`, operationId: meta.operationId, value: { kind: "stock-return", event: event2, groupId, delta: units.filter((u) => u.groupId === groupId).length } }));
  return { event: event2, state, ledger };
}
function envelope2(meta, kind, orderId) {
  return { operationId: meta.operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind, targetId: orderId };
}
function makeFreeCancellationChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedCancellationRevision,expectedServingRevision,expectedSessionRevision,kitchenConfirmed,orderId,reason,returnStock,selection" || !text6(data2.orderId) || !text6(data2.reason, 500) || data2.kitchenConfirmed !== true || !revision(data2.expectedSessionRevision)) throw new Error("Intent pembatalan gratis tidak sah");
  const serving2 = sourceChecks2(s, data2.orderId, meta, data2.expectedServingRevision, data2.expectedCancellationRevision);
  const unitIds = planFreeCancellation(s.batch, s.settlement, serving2, data2.selection);
  const event2 = { id: `free-cancel:${meta.operationId}`, settlementId: `settlement:${data2.orderId}`, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: s.session.id, unitIds, reason: data2.reason, kitchenConfirmed: true, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateFreeCancellationEvent(event2);
  const selected = new Set(unitIds), next = { ...serving2, units: serving2.units.map((u) => selected.has(u.id) ? { ...u, status: "cancelled" } : u) };
  const ret = data2.returnStock === null ? null : returnEffects3(s, unitIds, unitIds, data2.returnStock, meta, "cancellation", event2.id);
  return { ...envelope2(meta, "cancellation.free", data2.orderId), payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: freeCancellationKey(data2.orderId), expectedRevision: data2.expectedCancellationRevision, value: { recordType: "free-cancellations", schemaVersion: 1, cancellations: [...s.cancellations, event2] } }, { key: `serving:${data2.orderId}`, expectedRevision: data2.expectedServingRevision, value: { recordType: "serving", schemaVersion: 2, serving: next } }, ...ret ? [{ key: freeReturnKey(data2.orderId), expectedRevision: data2.returnStock.expectedReturnRevision, value: { recordType: "free-stock-returns", schemaVersion: 1, returns: [...s.returns, ret.event] } }, ...ret.state] : []], ledger: ret?.ledger ?? [], audit: [{ id: `free-cancellation-audit:${meta.operationId}`, operationId: meta.operationId, value: { cancellation: event2, stockReturn: ret?.event ?? null, before: serving2, after: next, policyVersion: meta.policyVersion } }], outbox: { id: `free-cancellation-outbox:${meta.operationId}`, operationId: meta.operationId, value: { orderId: data2.orderId, settlementId: event2.settlementId } }, result: { cancellation: event2, stockReturn: ret?.event ?? null, serving: next, cancellationRevision: s.cancellations.length, servingRevision: (data2.expectedServingRevision ?? -1) + 1, returnRevision: ret ? s.returns.length : null } };
}
function makeFreeReturnChange(s, data2, meta) {
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "cancellationId,expectedCancellationRevision,expectedReturnRevision,expectedServingRevision,expectedSessionRevision,groups,orderId,reason,sellable,unitIds" || !text6(data2.orderId) || !(data2.cancellationId === null || text6(data2.cancellationId)) || !revision(data2.expectedReturnRevision, true) || !revision(data2.expectedSessionRevision)) throw new Error("Intent return gratis tidak sah");
  const serving2 = sourceChecks2(s, data2.orderId, meta, data2.expectedServingRevision, data2.expectedCancellationRevision);
  const cancellation = data2.cancellationId === null ? null : s.cancellations.find((c) => c.id === data2.cancellationId);
  if (data2.cancellationId !== null && !cancellation) throw new Error("Pembatalan asal tidak ditemukan");
  const eligible = cancellation ? cancellation.unitIds : serving2.units.filter((u) => u.status === "served").map((u) => u.id);
  const ret = returnEffects3(s, data2.unitIds, eligible, { reason: data2.reason, sellable: data2.sellable, expectedReturnRevision: data2.expectedReturnRevision, groups: data2.groups }, meta, cancellation ? "cancellation" : "served", cancellation?.id ?? null);
  return { ...envelope2(meta, "return.free", data2.orderId), payload: { data: data2, metadata: meta, contractVersion: 1 }, state: [{ key: freeReturnKey(data2.orderId), expectedRevision: data2.expectedReturnRevision, value: { recordType: "free-stock-returns", schemaVersion: 1, returns: [...s.returns, ret.event] } }, ...ret.state], ledger: ret.ledger, audit: [{ id: `free-return-audit:${meta.operationId}`, operationId: meta.operationId, value: { stockReturn: ret.event, policyVersion: meta.policyVersion } }], outbox: { id: `free-return-outbox:${meta.operationId}`, operationId: meta.operationId, value: { orderId: data2.orderId, settlementId: ret.event.settlementId } }, result: { stockReturn: ret.event, returnRevision: s.returns.length } };
}

// src/storage/payment-correction.ts
var correctionKey = (orderId) => `payment-corrections:${orderId}`;
function makePaymentCorrectionChange(payment, session, history2, data2, meta, before) {
  if (!data2 || Object.keys(data2).sort().join(",") !== "expectedRevision,expectedSessionRevision,method,orderId,reason" || data2.orderId !== payment.orderId || data2.expectedRevision !== (history2.length ? history2.length - 1 : null) || !Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || session.id !== payment.cashSessionId || session.storeId !== payment.storeId || meta.storeId !== payment.storeId || !Number.isSafeInteger(before) || before < 0) throw new Error("Sumber koreksi tidak sah");
  const from = effectivePaymentMethod(payment, history2);
  const correction = { paymentId: payment.id, orderId: payment.orderId, storeId: payment.storeId, cashSessionId: payment.cashSessionId, from, to: data2.method, amount: payment.amount, reason: data2.reason, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateMethodCorrection(correction);
  const legs = correctionDeltas(correction), balance = before + legs.reduce((sum, leg) => sum + (leg.method === "cash" ? leg.delta : 0), 0);
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak sah");
  const operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "payment.correct-method", targetId: payment.orderId, payload: { data: data2, metadata: meta, contractVersion: 1, paymentSource: { id: payment.id, revision: 0 }, sessionSource: { id: session.id, revision: data2.expectedSessionRevision } }, state: [{ key: correctionKey(payment.orderId), expectedRevision: data2.expectedRevision, value: { recordType: "payment-corrections", schemaVersion: 1, corrections: [...history2, correction] } }, { key: `cash-session:${session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session } }], ledger: [{ id: `correction-ledger:${operationId}`, operationId, value: { kind: "method-correction", sessionId: session.id, storeId: session.storeId, correction, legs } }], audit: [{ id: `correction-audit:${operationId}`, operationId, value: { correction, actorId: meta.actorId, policyVersion: meta.policyVersion, before, after: balance } }], outbox: { id: `correction-outbox:${operationId}`, operationId, value: { orderId: payment.orderId, paymentId: payment.id } }, result: { correction, revision: history2.length, balance, sessionRevision: data2.expectedSessionRevision + 1 } };
}
function makeClosedPaymentAdjustmentChange(payment, source2, session, history2, data2, meta, before) {
  if (!data2 || Object.keys(data2).sort().join(",") !== "evidenceReference,executionSessionId,expectedRevision,expectedSessionRevision,expectedSourceRevision,method,orderId,reason,sourceSessionId" || data2.orderId !== payment.orderId || data2.expectedRevision !== (history2.length ? history2.length - 1 : null) || !Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || !Number.isSafeInteger(data2.expectedSourceRevision) || data2.expectedSourceRevision < 0 || source2.id !== payment.cashSessionId || data2.sourceSessionId !== source2.id || data2.executionSessionId !== session.id || source2.id === session.id || source2.storeId !== payment.storeId || session.storeId !== payment.storeId || meta.storeId !== payment.storeId || !Number.isSafeInteger(before) || before < 0) throw new Error("Sumber penyesuaian tidak sah");
  const correction = { paymentId: payment.id, orderId: payment.orderId, storeId: payment.storeId, cashSessionId: source2.id, executionSessionId: session.id, evidenceReference: data2.evidenceReference, from: effectivePaymentMethod(payment, history2), to: data2.method, amount: payment.amount, reason: data2.reason, actorId: meta.actorId, recordedAt: meta.recordedAt };
  validateMethodCorrection(correction);
  const legs = correctionDeltas(correction), balance = before + legs.reduce((sum, leg) => sum + (leg.method === "cash" ? leg.delta : 0), 0);
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error("Saldo kas tidak sah");
  const operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "payment.adjust-closed-method", targetId: payment.orderId, payload: { data: data2, metadata: meta, contractVersion: 1, paymentSource: { id: payment.id, revision: 0 }, sourceSession: { id: source2.id, revision: data2.expectedSourceRevision }, sessionSource: { id: session.id, revision: data2.expectedSessionRevision } }, state: [{ key: correctionKey(payment.orderId), expectedRevision: data2.expectedRevision, value: { recordType: "payment-corrections", schemaVersion: 1, corrections: [...history2, correction] } }, { key: `cash-session:${session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session } }], ledger: [{ id: `adjustment-ledger:${operationId}`, operationId, value: { kind: "method-adjustment", sessionId: session.id, storeId: session.storeId, correction, legs } }], audit: [{ id: `adjustment-audit:${operationId}`, operationId, value: { correction, actorId: meta.actorId, policyVersion: meta.policyVersion, before, after: balance } }], outbox: { id: `adjustment-outbox:${operationId}`, operationId, value: { orderId: payment.orderId, paymentId: payment.id } }, result: { correction, revision: history2.length, balance, sessionRevision: data2.expectedSessionRevision + 1 } };
}

// src/storage/free-settlement.ts
function validateFreeReason(reason5) {
  if (typeof reason5 !== "string" || !reason5.trim() || reason5.length > 500) throw new Error("Alasan gratis tidak sah");
}
function freeBatchIntent(data2) {
  return { orderId: data2.orderId, expectedDraftRevision: data2.expectedDraftRevision, mappings: data2.mappings, groups: data2.groups };
}
function makeConfirmedFreeChange(batch, data2, meta, sessionSource) {
  validateFirstBatch(batch);
  validateFreeReason(data2?.reason);
  if (!data2 || Object.keys(data2).sort().join(",") !== "expectedBatchRevision,expectedSessionRevision,orderId,reason" || data2.orderId !== batch.draft.orderId || data2.expectedBatchRevision !== 0 || !Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || batch.storeId !== meta.storeId || sessionSource.id !== batch.draft.cashSessionId || sessionSource.revision !== data2.expectedSessionRevision) throw new Error("Sumber gratis tidak sah");
  draftDateCode(meta.recordedAt, "UTC");
  const d = batch.draft;
  const settlement2 = freezeSettlement(d.orderId, d.items.map((i) => ({ unitIds: i.unitIds, skuId: i.skuId, skuPrice: i.skuPrice, toppingPrice: i.toppingPrice, promo: i.promo, identity: { choices: i.choices.map((c) => c.id), toppings: i.toppings.map((t) => t.id), serving: i.serving, note: i.note } })), d.discount, d.taxBp, d.serviceBp, "free");
  const operationId = meta.operationId;
  return {
    operationId,
    storeId: meta.storeId,
    deviceId: meta.deviceId,
    deviceEpoch: meta.deviceEpoch,
    localSequence: meta.localSequence,
    actorId: meta.actorId,
    policyVersion: meta.policyVersion,
    kind: "settlement.confirmed-free",
    targetId: d.orderId,
    payload: { data: data2, metadata: meta, contractVersion: 2, sessionSource },
    state: [{ key: `settlement:${d.orderId}`, expectedRevision: null, value: { recordType: "settlement", schemaVersion: 1, settlement: settlement2 } }, { key: `customer-job:${d.orderId}`, expectedRevision: null, value: { recordType: "customer-job", schemaVersion: 2, settlement: settlement2, batch, reason: data2.reason } }],
    ledger: [],
    audit: [{ id: `free-audit:${operationId}`, operationId, value: { orderId: d.orderId, sessionSource, batch, settlement: settlement2, reason: data2.reason, actorId: meta.actorId, policyVersion: meta.policyVersion, recordedAt: meta.recordedAt } }],
    outbox: { id: `free-outbox:${operationId}`, operationId, value: { orderId: d.orderId } },
    result: { orderId: d.orderId, settlement: settlement2 }
  };
}
function combineDraftFreeChange(batch, free, data2) {
  return { ...batch, kind: "settlement.draft-free", payload: { ...batch.payload, data: data2 }, state: [...batch.state, ...free.state], ledger: batch.ledger, audit: [...batch.audit, ...free.audit], outbox: { id: `draft-free-outbox:${batch.operationId}`, operationId: batch.operationId, value: { orderId: data2.orderId } }, result: { ...free.result, batchNumber: 1 } };
}
function draftFreeBatchPart(change) {
  const p = change.payload;
  return { ...change, kind: "batch.confirm-first", payload: { ...p, data: freeBatchIntent(p.data) }, state: change.state.filter((s) => s.key.startsWith("first-batch:") || s.key.startsWith("kitchen-job:") || s.key.startsWith("stock-group:")), ledger: change.ledger, audit: change.audit.slice(0, 1), outbox: { id: `batch-outbox:${change.operationId}`, operationId: change.operationId, value: { orderId: change.targetId } }, result: { orderId: change.targetId, batchNumber: 1 } };
}

// src/storage/payment-methods.ts
function paymentMethodsKey(storeId) {
  return `payment-methods:${storeId}`;
}
function makePaymentMethodsChange(data2, meta, before) {
  if (!data2 || Object.keys(data2).sort().join(",") !== "ewallet,expectedRevision,qris,transfer" || data2.expectedRevision !== null && (!Number.isSafeInteger(data2.expectedRevision) || data2.expectedRevision < 0) || before === null !== (data2.expectedRevision === null)) throw new Error("Revisi metode tidak sah");
  const methods = { storeId: meta.storeId, qris: data2.qris, transfer: data2.transfer, ewallet: data2.ewallet };
  validatePaymentMethods(methods);
  if (before) {
    validatePaymentMethods(before);
    if (before.storeId !== meta.storeId) throw new Error("Toko berbeda");
  }
  draftDateCode(meta.recordedAt, "UTC");
  const operationId = meta.operationId, revision2 = (data2.expectedRevision ?? -1) + 1;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "payment-methods.set", targetId: meta.storeId, payload: { data: data2, metadata: meta }, state: [{ key: paymentMethodsKey(meta.storeId), expectedRevision: data2.expectedRevision, value: { recordType: "payment-methods", schemaVersion: 1, methods } }], ledger: [], audit: [{ id: `payment-methods-audit:${operationId}`, operationId, value: { before, after: methods, actorId: meta.actorId, policyVersion: meta.policyVersion, recordedAt: meta.recordedAt } }], outbox: { id: `payment-methods-outbox:${operationId}`, operationId, value: { storeId: meta.storeId } }, result: { methods, revision: revision2 } };
}

// src/storage/noncash-payment.ts
function noncashBatchIntent(data2) {
  return { orderId: data2.orderId, expectedDraftRevision: data2.expectedDraftRevision, mappings: data2.mappings, groups: data2.groups };
}
function makeConfirmedNoncashChange(batch, data2, meta, sessionSource, methodsSource) {
  validateFirstBatch(batch);
  if (!data2 || !["expectedBatchRevision,expectedMethodsRevision,expectedSessionRevision,method,note,orderId,verified", "expectedBatchRevision,expectedMethodsRevision,expectedSessionRevision,method,orderId,verified"].includes(Object.keys(data2).sort().join(",")) || data2.orderId !== batch.draft.orderId || data2.expectedBatchRevision !== 0 || !Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || !Number.isSafeInteger(data2.expectedMethodsRevision) || data2.expectedMethodsRevision < 0 || batch.storeId !== meta.storeId || sessionSource.id !== batch.draft.cashSessionId || sessionSource.revision !== data2.expectedSessionRevision || methodsSource.id !== meta.storeId || methodsSource.revision !== data2.expectedMethodsRevision) throw new Error("Sumber pembayaran tidak sah");
  const d = batch.draft, settlement2 = freezeSettlement(d.orderId, d.items.map((i) => ({ unitIds: i.unitIds, skuId: i.skuId, skuPrice: i.skuPrice, toppingPrice: i.toppingPrice, promo: i.promo, identity: { choices: i.choices.map((c) => c.id), toppings: i.toppings.map((t) => t.id), serving: i.serving, note: i.note } })), d.discount, d.taxBp, d.serviceBp, "payment");
  const payment = { id: `payment:${d.orderId}`, orderId: d.orderId, storeId: meta.storeId, cashSessionId: sessionSource.id, settlementId: `settlement:${d.orderId}`, paidAt: meta.recordedAt, method: data2.method, amount: settlement2.totals.total, verified: data2.verified, note: data2.note ?? null };
  validateNoncashPayment(payment);
  const operationId = meta.operationId;
  return { operationId, storeId: meta.storeId, deviceId: meta.deviceId, deviceEpoch: meta.deviceEpoch, localSequence: meta.localSequence, actorId: meta.actorId, policyVersion: meta.policyVersion, kind: "payment.confirmed-noncash", targetId: d.orderId, payload: { data: data2, metadata: meta, contractVersion: 2, sessionSource, methodsSource }, state: [{ key: payment.settlementId, expectedRevision: null, value: { recordType: "settlement", schemaVersion: 1, settlement: settlement2 } }, { key: payment.id, expectedRevision: null, value: { recordType: "payment", schemaVersion: 2, payment } }, { key: `customer-job:${d.orderId}`, expectedRevision: null, value: { recordType: "customer-job", schemaVersion: 3, payment, settlement: settlement2, batch } }], ledger: [], audit: [{ id: `noncash-audit:${operationId}`, operationId, value: { payment, settlement: settlement2, sessionSource, methodsSource, actorId: meta.actorId, policyVersion: meta.policyVersion } }], outbox: { id: `noncash-outbox:${operationId}`, operationId, value: { orderId: d.orderId, paymentId: payment.id } }, result: { orderId: d.orderId, payment, settlement: settlement2 } };
}
function combineDraftNoncashChange(batch, payment, data2) {
  return { ...batch, kind: "payment.draft-noncash", payload: { ...batch.payload, data: data2, methodsSource: payment.payload.methodsSource }, state: [...batch.state, ...payment.state], ledger: batch.ledger, audit: [...batch.audit, ...payment.audit], outbox: { id: `draft-noncash-outbox:${batch.operationId}`, operationId: batch.operationId, value: { orderId: data2.orderId, paymentId: `payment:${data2.orderId}` } }, result: { ...payment.result, batchNumber: 1 } };
}
function draftNoncashBatchPart(change) {
  const p = change.payload;
  return { ...change, kind: "batch.confirm-first", payload: { data: noncashBatchIntent(p.data), metadata: p.metadata, contractVersion: p.contractVersion, sessionSource: p.sessionSource }, state: change.state.filter((s) => s.key.startsWith("first-batch:") || s.key.startsWith("kitchen-job:") || s.key.startsWith("stock-group:")), ledger: change.ledger, audit: change.audit.slice(0, 1), outbox: { id: `batch-outbox:${change.operationId}`, operationId: change.operationId, value: { orderId: change.targetId } }, result: { orderId: change.targetId, batchNumber: 1 } };
}

// src/storage/draft-cash-contract.ts
function batchIntent(data2) {
  return { orderId: data2.orderId, expectedDraftRevision: data2.expectedDraftRevision, mappings: data2.mappings, groups: data2.groups };
}
function combineDraftCashChange(batch, payment, data2) {
  return {
    ...batch,
    kind: "payment.draft-cash",
    payload: { ...batch.payload, data: data2 },
    state: [...batch.state, ...payment.state],
    ledger: [...payment.ledger, ...batch.ledger],
    audit: [...batch.audit, ...payment.audit],
    outbox: { id: `draft-cash-outbox:${batch.operationId}`, operationId: batch.operationId, value: { orderId: data2.orderId, paymentId: `payment:${data2.orderId}` } },
    result: { ...payment.result, batchNumber: 1 }
  };
}
function draftCashBatchPart(change) {
  const p = change.payload;
  const data2 = batchIntent(p.data);
  return {
    ...change,
    kind: "batch.confirm-first",
    payload: { ...p, data: data2 },
    state: change.state.filter((s) => s.key.startsWith("first-batch:") || s.key.startsWith("kitchen-job:") || s.key.startsWith("stock-group:")),
    ledger: change.ledger.slice(1),
    audit: change.audit.slice(0, 1),
    outbox: { id: `batch-outbox:${change.operationId}`, operationId: change.operationId, value: { orderId: change.targetId } },
    result: { orderId: change.targetId, batchNumber: 1 }
  };
}

// src/storage/confirmed-cash-payment.ts
function makeConfirmedCashPaymentChange(batch, session, data2, meta, before) {
  validateFirstBatch(batch);
  if (!data2 || Object.keys(data2).sort().join(",") !== "expectedBatchRevision,expectedSessionRevision,orderId,received" || data2.orderId !== batch.draft.orderId || data2.expectedBatchRevision !== 0 || !Number.isSafeInteger(data2.expectedSessionRevision) || data2.expectedSessionRevision < 0 || batch.storeId !== meta.storeId || session.storeId !== meta.storeId || session.id !== batch.draft.cashSessionId) throw new Error("Sumber pembayaran tidak sah");
  const d = batch.draft;
  const settlement2 = freezeSettlement(d.orderId, d.items.map((i) => ({ unitIds: i.unitIds, skuId: i.skuId, skuPrice: i.skuPrice, toppingPrice: i.toppingPrice, promo: i.promo, identity: { choices: i.choices.map((c) => c.id), toppings: i.toppings.map((t) => t.id), serving: i.serving, note: i.note } })), d.discount, d.taxBp, d.serviceBp, "payment");
  const payment = { id: `payment:${d.orderId}`, orderId: d.orderId, storeId: meta.storeId, cashSessionId: session.id, settlementId: `settlement:${d.orderId}`, paidAt: meta.recordedAt, method: "cash", amount: settlement2.totals.total, received: data2.received, change: data2.received - settlement2.totals.total };
  validateCashPayment(payment);
  const balance = before + payment.amount;
  if (!Number.isSafeInteger(before) || before < 0 || !Number.isSafeInteger(balance)) throw new Error("Saldo kas tidak sah");
  const operationId = meta.operationId;
  return {
    operationId,
    storeId: meta.storeId,
    deviceId: meta.deviceId,
    deviceEpoch: meta.deviceEpoch,
    localSequence: meta.localSequence,
    actorId: meta.actorId,
    policyVersion: meta.policyVersion,
    kind: "payment.confirmed-cash",
    targetId: d.orderId,
    payload: { data: data2, metadata: meta, contractVersion: 1 },
    state: [{ key: `cash-session:${session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session } }, { key: payment.settlementId, expectedRevision: null, value: { recordType: "settlement", schemaVersion: 1, settlement: settlement2 } }, { key: payment.id, expectedRevision: null, value: { recordType: "payment", schemaVersion: 1, payment } }, { key: `customer-job:${d.orderId}`, expectedRevision: null, value: { recordType: "customer-job", schemaVersion: 1, payment, settlement: settlement2, batch } }],
    ledger: [{ id: `payment-ledger:${operationId}`, operationId, value: { kind: "sale", sessionId: session.id, storeId: meta.storeId, amount: payment.amount, category: "", description: "" } }],
    audit: [{ id: `payment-audit:${operationId}`, operationId, value: { payment, settlement: settlement2, actorId: meta.actorId, policyVersion: meta.policyVersion, before, after: balance } }],
    outbox: { id: `payment-outbox:${operationId}`, operationId, value: { orderId: d.orderId, paymentId: payment.id } },
    result: { orderId: d.orderId, payment, settlement: settlement2, balance, sessionRevision: data2.expectedSessionRevision + 1 }
  };
}

// src/storage/serving.ts
function makeServingChange(batch, before, data2, meta, action, sessionSource, refundSource, additional) {
  validateFirstBatch(batch);
  if (!data2 || typeof data2 !== "object" || Array.isArray(data2) || Object.keys(data2).sort().join(",") !== "expectedRevision,orderId,reason,unitIds" || data2.orderId !== batch.draft.orderId || data2.expectedRevision !== null && (!Number.isSafeInteger(data2.expectedRevision) || data2.expectedRevision < 0) || before === null !== (data2.expectedRevision === null)) throw new Error("Intent penyajian tidak sah");
  if (action !== "serve" && action !== "correct") throw new Error("Aksi penyajian tidak sah");
  draftDateCode(meta.recordedAt, "UTC");
  const base = initialServing(batch), initial = additional ? { ...base, units: [...base.units, ...additional.draft.items.flatMap((item) => item.unitIds.map((id8) => ({ id: id8, status: "processed" })))] } : base, previous = before ?? initial;
  if (additional && (additional.orderId !== batch.draft.orderId || additional.cashSessionId !== batch.draft.cashSessionId || additional.storeId !== batch.storeId || additional.number !== 2)) throw new Error("Sumber batch tambahan tidak sesuai");
  if (previous.storeId !== initial.storeId || previous.orderId !== initial.orderId || previous.cashSessionId !== initial.cashSessionId || canonical(previous.units.map((x) => x.id).sort()) !== canonical(initial.units.map((x) => x.id).sort()) || batch.storeId !== meta.storeId || sessionSource.id !== initial.cashSessionId || !Number.isSafeInteger(sessionSource.revision) || sessionSource.revision < 0) throw new Error("Sumber penyajian tidak sesuai");
  if (refundSource && data2.unitIds.some((id8) => refundSource.unitIds.includes(id8))) throw new Error("Unit sudah direfund");
  const next = changeServing(previous, data2.unitIds, action, data2.reason), operationId = meta.operationId;
  return {
    operationId,
    storeId: meta.storeId,
    deviceId: meta.deviceId,
    deviceEpoch: meta.deviceEpoch,
    localSequence: meta.localSequence,
    actorId: meta.actorId,
    policyVersion: meta.policyVersion,
    kind: `serving.${action}`,
    targetId: data2.orderId,
    payload: refundSource ? { data: data2, metadata: meta, contractVersion: 2, sessionSource, refundRevision: refundSource.revision } : { data: data2, metadata: meta, contractVersion: 1, sessionSource },
    state: [{ key: `serving:${data2.orderId}`, expectedRevision: data2.expectedRevision, value: { recordType: "serving", schemaVersion: previous.units.some((unit) => unit.status === "cancelled") ? 2 : 1, serving: next } }],
    ledger: [],
    audit: [{ id: `serving-audit:${operationId}`, operationId, value: { action, orderId: data2.orderId, unitIds: data2.unitIds, reason: data2.reason, actorId: meta.actorId, policyVersion: meta.policyVersion, occurredAt: meta.recordedAt, before: previous, after: next } }],
    outbox: { id: `serving-outbox:${operationId}`, operationId, value: { orderId: data2.orderId } },
    result: { orderId: data2.orderId, revision: (data2.expectedRevision ?? -1) + 1, serving: next }
  };
}

// src/storage/order-additions.ts
var additionsKey = (orderId) => `order-additions:${orderId}`;
var additionalBatchKey = (orderId, number) => `order-batch:${orderId}:${number}`;
var additionalKitchenJobKey = (orderId, number) => `kitchen-job:${orderId}:${number}`;

// src/storage/payment-additions-cash.ts
var itemLines = (draft) => draft.items.map((item) => ({ unitIds: item.unitIds, skuId: item.skuId, skuPrice: item.skuPrice, toppingPrice: item.toppingPrice, promo: item.promo, identity: { choices: item.choices.map((c) => c.id), toppings: item.toppings.map((t) => t.id), serving: item.serving, note: item.note } }));
var object3 = (v) => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
var id6 = (v) => typeof v === "string" && !!v.trim() && v.length <= 200;
var int = (v, min = 0) => typeof v === "number" && Number.isSafeInteger(v) && v >= min;
var exact2 = (v, keys) => object3(v) && Object.keys(v).sort().join(",") === [...keys].sort().join(",");
function validateInput(value) {
  if (!exact2(value, ["expectedBatchRevision", "expectedCatalogRevision", "expectedServingRevision", "expectedSessionRevision", "expectedTotal", "items", "orderId", "received"])) throw new Error("Input tambahan tidak sah");
  const v = value;
  if (!id6(v.orderId) || !int(v.expectedBatchRevision) || !(v.expectedServingRevision === null || int(v.expectedServingRevision)) || !int(v.expectedSessionRevision) || !int(v.expectedCatalogRevision) || !int(v.expectedTotal, 1) || !int(v.received, 1) || !Array.isArray(v.items) || !v.items.length || !v.items.every((x) => exact2(x, ["expectedUnitPrice", "itemId", "note", "serving", "skuId", "unitIds"]) && id6(x.itemId) && id6(x.skuId) && int(x.expectedUnitPrice, 1) && ["dine_in", "takeaway"].includes(x.serving) && typeof x.note === "string" && x.note.length <= 200 && Array.isArray(x.unitIds) && x.unitIds.length >= 1 && x.unitIds.length <= 999 && x.unitIds.every(id6)) || new Set(v.items.map((x) => x.itemId)).size !== v.items.length || new Set(v.items.flatMap((x) => x.unitIds)).size !== v.items.reduce((n, x) => n + x.unitIds.length, 0)) throw new Error("Input tambahan tidak sah");
}
function makeAdditionsCashChange(firstBatch, batch, additions, beforeServing, session, data2, meta, groups, before) {
  const first = firstBatch.draft;
  validateDraft(first);
  validateInput(data2);
  validateBusinessRecord({ recordType: "order-additions", schemaVersion: 1, additions });
  if (first.orderId !== data2.orderId || batch.orderId !== data2.orderId || batch.number !== 2 || additions.batchCount !== 1 || batch.cashSessionId !== session.id || first.cashSessionId !== session.id || session.storeId !== meta.storeId) throw new Error("Sumber tambahan tidak sah");
  const firstServing = initialServing(firstBatch);
  const previous = beforeServing ?? firstServing;
  validateServingState(previous);
  const oldIds = new Set(firstServing.units.map((u) => u.id));
  if (batch.draft.items.flatMap((i) => i.unitIds).some((unit) => oldIds.has(unit))) throw new Error("Unit tambahan digunakan ulang");
  const allUnits = [...firstServing.units, ...batch.draft.items.flatMap((i) => i.unitIds.map((id8) => ({ id: id8, status: "processed" })))];
  if (previous.storeId !== meta.storeId || previous.orderId !== data2.orderId || previous.cashSessionId !== session.id || previous.units.some((u) => !oldIds.has(u.id)) || new Set(previous.units.map((u) => u.id)).size !== previous.units.length) throw new Error("Sumber penyajian tidak sah");
  const serving2 = { ...previous, units: [...previous.units, ...allUnits.filter((unit) => !oldIds.has(unit.id))] };
  const settlement2 = freezeSettlement(data2.orderId, [...itemLines(first), ...itemLines(batch.draft)], { kind: "none" }, 0, 0, "payment");
  if (settlement2.totals.total !== data2.expectedTotal || data2.received < settlement2.totals.total) throw new Error("Total atau uang diterima tidak sesuai");
  const payment = { id: `payment:${data2.orderId}`, orderId: data2.orderId, storeId: meta.storeId, cashSessionId: session.id, settlementId: `settlement:${data2.orderId}`, paidAt: meta.recordedAt, method: "cash", amount: settlement2.totals.total, received: data2.received, change: data2.received - settlement2.totals.total };
  validateCashPayment(payment);
  const plan = planAdditionalBatchDebits(batch, groups.map((g) => ({ groupId: g.stock.groupId, balance: g.stock.balance })));
  if (!plan.ok) throw new Error("Stok tidak cukup");
  const balance = before + payment.amount;
  if (!int(balance)) throw new Error("Saldo kas tidak sah");
  const op = meta.operationId;
  return {
    operationId: op,
    storeId: meta.storeId,
    deviceId: meta.deviceId,
    deviceEpoch: meta.deviceEpoch,
    localSequence: meta.localSequence,
    actorId: meta.actorId,
    policyVersion: meta.policyVersion,
    kind: "payment.multi-batch-cash",
    targetId: data2.orderId,
    payload: { data: data2, metadata: meta, contractVersion: 2, sessionSource: { id: session.id, revision: data2.expectedSessionRevision }, sources: { firstBatchRevision: data2.expectedBatchRevision, servingRevision: data2.expectedServingRevision, sessionRevision: data2.expectedSessionRevision, catalogRevision: data2.expectedCatalogRevision, groups: groups.map((g) => ({ groupId: g.stock.groupId, revision: g.row.revision, balance: g.stock.balance })), mappings: batch.skuGroups } },
    state: [{ key: additionsKey(data2.orderId), expectedRevision: null, value: { recordType: "order-additions", schemaVersion: 1, additions: { ...additions, batchCount: 2, pending: [] } } }, { key: additionalBatchKey(data2.orderId, 2), expectedRevision: null, value: { recordType: "order-batch", schemaVersion: 1, batch } }, { key: additionalKitchenJobKey(data2.orderId, 2), expectedRevision: null, value: { recordType: "kitchen-job-addition", schemaVersion: 1, batch } }, ...groups.map((g) => ({ key: g.row.key, expectedRevision: g.row.revision, value: { recordType: "stock-group", schemaVersion: 1, stockGroup: { ...g.stock, balance: plan.debits.find((d) => d.groupId === g.stock.groupId).after } } })), { key: `serving:${data2.orderId}`, expectedRevision: data2.expectedServingRevision, value: { recordType: "serving", schemaVersion: 1, serving: serving2 } }, { key: `cash-session:${session.id}`, expectedRevision: data2.expectedSessionRevision, value: { recordType: "cash-session", schemaVersion: 1, session } }, { key: payment.settlementId, expectedRevision: null, value: { recordType: "settlement", schemaVersion: 1, settlement: settlement2 } }, { key: payment.id, expectedRevision: null, value: { recordType: "payment", schemaVersion: 1, payment } }, { key: `customer-job:${data2.orderId}`, expectedRevision: null, value: { recordType: "customer-job", schemaVersion: 4, payment, settlement: settlement2, batches: [firstBatch, batch] } }],
    ledger: [{ id: `payment-ledger:${op}`, operationId: op, value: { kind: "sale", sessionId: session.id, storeId: meta.storeId, amount: payment.amount, category: "", description: "" } }, ...plan.debits.map((debit) => ({ id: `batch-debit:${op}:${debit.groupId}`, operationId: op, value: { storeId: meta.storeId, orderId: data2.orderId, ...debit } }))],
    audit: [{ id: `payment-additions-audit:${op}`, operationId: op, value: { payment, settlement: settlement2, batch, actorId: meta.actorId, policyVersion: meta.policyVersion, before, after: balance } }],
    outbox: { id: `payment-additions-outbox:${op}`, operationId: op, value: { orderId: data2.orderId, paymentId: payment.id } },
    result: { orderId: data2.orderId, batchNumber: 2, payment, settlement: settlement2, balance, sessionRevision: data2.expectedSessionRevision + 1 }
  };
}

// src/storage/transitions.ts
function typed3(value) {
  if (value && typeof value === "object" && Object.hasOwn(value, "recordType")) return value;
  return void 0;
}
function validateTransitions(receipts, state) {
  const changes2 = receipts.map((r) => JSON.parse(r.payload));
  const byKey = /* @__PURE__ */ new Map();
  for (const change of changes2) for (const row2 of change.state) {
    if (change.kind.startsWith("cash.") && (!row2.value || typeof row2.value !== "object" || !("recordType" in row2.value) || row2.value.recordType !== "cash-session")) throw new Error("Record kas wajib bertipe");
    if (change.kind === "mapping.create" && (!row2.value || typeof row2.value !== "object" || !("recordType" in row2.value) || row2.value.recordType !== "sku-stock-mapping")) throw new Error("Record pemetaan wajib bertipe");
    if (change.kind.startsWith("stock.") && (!row2.value || typeof row2.value !== "object" || !("recordType" in row2.value) || row2.value.recordType !== "stock-group")) throw new Error("Record stok wajib bertipe");
    const versions = byKey.get(row2.key) ?? [];
    versions.push({ change, revision: (row2.expectedRevision ?? -1) + 1, value: row2.value });
    byKey.set(row2.key, versions);
  }
  const settlements = /* @__PURE__ */ new Map();
  const refunds = /* @__PURE__ */ new Map();
  const draftSequences = /* @__PURE__ */ new Map();
  const draftOrders = /* @__PURE__ */ new Map(), draftNumbers = /* @__PURE__ */ new Map(), platformIds = /* @__PURE__ */ new Map(), draftUnits = /* @__PURE__ */ new Map(), draftItems = /* @__PURE__ */ new Map();
  const unique = (map, identity, order) => {
    const prior = map.get(identity);
    if (prior && prior !== order) throw new Error("Identitas draft duplikat");
    map.set(identity, order);
  };
  const edges = /* @__PURE__ */ new Map();
  const edge = (from, to) => {
    if (from === to) return;
    const next = edges.get(from) ?? /* @__PURE__ */ new Set();
    next.add(to);
    edges.set(from, next);
  };
  const streams = /* @__PURE__ */ new Map();
  for (const change of changes2) {
    const key2 = JSON.stringify([change.storeId, change.deviceId, change.deviceEpoch]);
    const stream2 = streams.get(key2) ?? [];
    stream2.push(change);
    streams.set(key2, stream2);
  }
  for (const stream2 of streams.values()) {
    stream2.sort((a, b) => a.localSequence - b.localSequence);
    for (let i = 1; i < stream2.length; i++) edge(stream2[i - 1].operationId, stream2[i].operationId);
  }
  const stateByKey = new Map(state.map((row2) => [row2.key, row2]));
  for (const change of changes2.filter((c) => c.kind === "catalog.category-create" || c.kind === "catalog.simple-create")) {
    const p = change.payload;
    if (p?.contractVersion !== 1 || !p.metadata || !p.data || p.metadata.storeId !== change.storeId || p.metadata.operationId !== change.operationId) throw new Error("Kontrak katalog tidak sah");
    const versions = byKey.get(`catalog:${change.storeId}`) ?? [];
    const revision2 = p.data.expectedCatalogRevision;
    const prior = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2);
    const record2 = typed3(prior?.value);
    if (revision2 !== null && (!prior || record2?.recordType !== "simple-catalog")) throw new Error("Sumber katalog tidak ada");
    const catalog = record2?.recordType === "simple-catalog" ? record2.catalog : { storeId: change.storeId, categories: [], menus: [] };
    if (prior) edge(prior.change.operationId, change.operationId);
    const expected = makeCatalogChange(catalog, revision2, p.data, p.metadata, p.recordedAt);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek katalog tidak sesuai");
  }
  for (const change of changes2.filter((c) => c.kind === "cancellation.unpaid" || c.kind === "return.unpaid")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId) throw new Error("Kontrak unpaid tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source3 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source3?.value);
      if (revision2 !== null && (!source3 || source3.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber unpaid tidak sah");
      if (source3) edge(source3.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, d.expectedBatchRevision, "first-batch");
    const source2 = byKey.get(`first-batch:${order}`)?.find((v) => v.revision === 0);
    if (batch?.recordType !== "first-batch" || batch.schemaVersion !== 2 || !source2 || source2.change.kind !== "batch.confirm-first" || source2.change.payload.contractVersion !== 2 || ["settlement", "payment", "customer-job", "refund-history", "paid-cancellations", "served-refunds", "stock-returns", "free-cancellations", "free-stock-returns", "payment-corrections"].some((prefix2) => byKey.has(`${prefix2}:${order}`)) || changes2.some((c) => c.state.some((row2) => {
      const record2 = typed3(row2.value);
      return (record2?.recordType === "refund-history" || record2?.recordType === "settlement") && record2.settlement.orderId === order;
    }))) throw new Error("Sumber finansial atau batch unpaid tidak sah");
    const serving2 = version(`serving:${order}`, d.expectedServingRevision, "serving"), session = version(`cash-session:${batch.batch.draft.cashSessionId}`, d.expectedSessionRevision, "cash-session");
    const cancellation = version(unpaidCancellationKey(order), change.kind === "return.unpaid" ? d.expectedCancellationRevision : null, "unpaid-cancellation");
    const option = change.kind === "cancellation.unpaid" ? d.returnStock : null;
    if (change.kind === "cancellation.unpaid" && option !== null && (!option || !Array.isArray(option.groups))) throw new Error("Opsi return unpaid tidak sah");
    const returnRevision = change.kind === "return.unpaid" ? d.expectedReturnRevision : option?.expectedReturnRevision ?? null;
    const returns = version(unpaidReturnKey(order), returnRevision, "unpaid-stock-returns");
    const groupSources = change.kind === "return.unpaid" ? d.groups : option?.groups ?? [];
    if (serving2 && serving2.recordType !== "serving" || session?.recordType !== "cash-session" || cancellation && cancellation.recordType !== "unpaid-cancellation" || returns && returns.recordType !== "unpaid-stock-returns" || !Array.isArray(groupSources)) throw new Error("Histori unpaid tidak sah");
    const groups = groupSources.map((g) => {
      const r = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (r?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return r.stockGroup;
    });
    const sources = { batch: batch.batch, session: session.session, serving: serving2?.serving ?? null, cancellation: cancellation?.cancellation ?? null, returns: returns?.returns ?? [], groups };
    const expected = change.kind === "cancellation.unpaid" ? makeUnpaidCancellationChange(sources, d, p.metadata) : makeUnpaidReturnChange(sources, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek unpaid tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "cancellation.free" || c.kind === "return.free")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId) throw new Error("Kontrak pembatalan gratis tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber gratis tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), settlement2 = version(`settlement:${order}`, 0, "settlement");
    const batchSource = byKey.get(`first-batch:${order}`)?.find((v) => v.revision === 0), settlementSource = byKey.get(`settlement:${order}`)?.find((v) => v.revision === 0);
    if (batch?.recordType !== "first-batch" || settlement2?.recordType !== "settlement" || !batchSource || !["batch.confirm-first", "settlement.draft-free"].includes(batchSource.change.kind) || !settlementSource || !["settlement.confirmed-free", "settlement.draft-free"].includes(settlementSource.change.kind) || ["payment:", "paid-cancellations:", "served-refunds:", "stock-returns:"].some((prefix2) => byKey.has(`${prefix2}${order}`))) throw new Error("Sumber settlement gratis tidak sah");
    const serving2 = version(`serving:${order}`, d.expectedServingRevision, "serving"), session = version(`cash-session:${batch.batch.draft.cashSessionId}`, d.expectedSessionRevision, "cash-session"), cancellations = version(freeCancellationKey(order), d.expectedCancellationRevision, "free-cancellations");
    const option = change.kind === "cancellation.free" ? d.returnStock : null;
    if (change.kind === "cancellation.free" && option !== null && (!option || !Array.isArray(option.groups))) throw new Error("Opsi return gratis tidak sah");
    const returnRevision = change.kind === "return.free" ? d.expectedReturnRevision : option?.expectedReturnRevision;
    const returns = returnRevision === void 0 ? void 0 : version(freeReturnKey(order), returnRevision, "free-stock-returns");
    const groupSources = change.kind === "return.free" ? d.groups : option?.groups ?? [];
    if (serving2 && serving2.recordType !== "serving" || session?.recordType !== "cash-session" || cancellations && cancellations.recordType !== "free-cancellations" || returns && returns.recordType !== "free-stock-returns" || !Array.isArray(groupSources)) throw new Error("Histori gratis tidak sah");
    const groups = groupSources.map((g) => {
      const r = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (r?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return r.stockGroup;
    });
    const sources = { batch: batch.batch, settlement: settlement2.settlement, session: session.session, serving: serving2?.serving ?? null, cancellations: cancellations?.cancellations ?? [], returns: returns?.returns ?? [], groups };
    const expected = change.kind === "cancellation.free" ? makeFreeCancellationChange(sources, d, p.metadata) : makeFreeReturnChange(sources, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek gratis tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "cancellation.paid")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId) throw new Error("Kontrak pembatalan tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber pembatalan tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), payment = version(`payment:${order}`, 0, "payment"), settlement2 = version(`settlement:${order}`, 0, "settlement");
    const pv = byKey.get(`payment:${order}`)?.find((v) => v.revision === 0);
    if (batch?.recordType !== "first-batch" || payment?.recordType !== "payment" || settlement2?.recordType !== "settlement" || !pv || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(pv.change.kind)) throw new Error("Payment asal tidak sah");
    if (changes2.some((c) => c.state.some((row2) => {
      const v = typed3(row2.value);
      return v?.recordType === "refund-history" && v.settlement.orderId === order && c.storeId === change.storeId;
    }))) throw new Error("Histori refund lama memerlukan rekonsiliasi");
    const serving2 = version(`serving:${order}`, d.expectedServingRevision, "serving"), session = version(`cash-session:${payment.payment.cashSessionId}`, d.expectedSessionRevision, "cash-session"), cancellations = version(cancellationKey(order), d.expectedCancellationRevision, "paid-cancellations"), refunds2 = version(refundKey(order), d.expectedRefundRevision, "served-refunds");
    if (serving2 && serving2.recordType !== "serving" || session?.recordType !== "cash-session" || cancellations && cancellations.recordType !== "paid-cancellations" || refunds2 && refunds2.recordType !== "served-refunds") throw new Error("Sumber pembatalan tidak lengkap");
    const returns = d.returnStock === null ? void 0 : version(returnKey(order), d.returnStock?.expectedReturnRevision, "stock-returns");
    if (returns && returns.recordType !== "stock-returns") throw new Error("Sumber return tidak sah");
    if (d.returnStock !== null && (!d.returnStock || !Array.isArray(d.returnStock.groups))) throw new Error("Sumber grup tidak sah");
    const groups = (d.returnStock?.groups ?? []).map((g) => {
      const record2 = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (record2?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return record2.stockGroup;
    });
    const expected = makePaidCancellationChange({ batch: batch.batch, payment: payment.payment, settlement: settlement2.settlement, serving: serving2?.serving ?? null, session: session.session, cancellations: cancellations?.cancellations ?? [], refunds: refunds2?.refunds ?? [], returns: returns?.returns ?? [], groups }, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek pembatalan tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "cancellation.return-stock")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId || !Array.isArray(p.data.groups)) throw new Error("Kontrak return pembatalan tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber return tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), payment = version(`payment:${order}`, 0, "payment"), settlement2 = version(`settlement:${order}`, 0, "settlement"), cancellations = version(cancellationKey(order), d.expectedCancellationRevision, "paid-cancellations"), returns = version(returnKey(order), d.expectedReturnRevision, "stock-returns");
    if (batch?.recordType !== "first-batch" || payment?.recordType !== "payment" || settlement2?.recordType !== "settlement" || cancellations?.recordType !== "paid-cancellations" || returns && returns.recordType !== "stock-returns") throw new Error("Sumber return tidak lengkap");
    const session = version(`cash-session:${payment.payment.cashSessionId}`, d.expectedSessionRevision, "cash-session");
    if (session?.recordType !== "cash-session") throw new Error("Sesi return tidak sah");
    const groups = d.groups.map((g) => {
      const record2 = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (record2?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return record2.stockGroup;
    });
    const expected = makeCancelledReturnChange({ batch: batch.batch, payment: payment.payment, settlement: settlement2.settlement, serving: null, session: session.session, cancellations: cancellations.cancellations, refunds: [], returns: returns?.returns ?? [], groups }, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek return tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "cancellation.refund-paid")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId) throw new Error("Kontrak batal refund tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber batal refund tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), payment = version(`payment:${order}`, 0, "payment"), settlement2 = version(`settlement:${order}`, 0, "settlement");
    const pv = byKey.get(`payment:${order}`)?.find((v) => v.revision === 0);
    if (batch?.recordType !== "first-batch" || payment?.recordType !== "payment" || settlement2?.recordType !== "settlement" || !pv || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(pv.change.kind)) throw new Error("Payment asal tidak sah");
    if (changes2.some((c) => c.state.some((row2) => {
      const v = typed3(row2.value);
      return v?.recordType === "refund-history" && v.settlement.orderId === order && c.storeId === change.storeId;
    }))) throw new Error("Histori refund lama memerlukan rekonsiliasi");
    const serving2 = version(`serving:${order}`, d.expectedServingRevision, "serving"), session = version(`cash-session:${payment.payment.cashSessionId}`, d.expectedSessionRevision, "cash-session"), cancellations = version(cancellationKey(order), d.expectedCancellationRevision, "paid-cancellations"), refunds2 = version(refundKey(order), d.expectedRefundRevision, "served-refunds"), corrections = version(correctionKey(order), d.expectedCorrectionRevision, "payment-corrections"), returns = d.returnStock === null ? void 0 : version(returnKey(order), d.returnStock?.expectedReturnRevision, "stock-returns");
    if (serving2 && serving2.recordType !== "serving" || session?.recordType !== "cash-session" || cancellations && cancellations.recordType !== "paid-cancellations" || refunds2 && refunds2.recordType !== "served-refunds" || corrections && corrections.recordType !== "payment-corrections" || returns && returns.recordType !== "stock-returns" || d.returnStock !== null && (!d.returnStock || !Array.isArray(d.returnStock.groups))) throw new Error("Sumber batal refund tidak lengkap");
    const groups = (d.returnStock?.groups ?? []).map((g) => {
      const record2 = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (record2?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return record2.stockGroup;
    });
    const entries = (byKey.get(`cash-session:${session.session.id}`) ?? []).filter((v) => v.revision <= d.expectedSessionRevision).sort((a, b) => a.revision - b.revision).map((v) => v.change.ledger[0]?.value).filter((e) => !!e);
    const expected = makeCancelRefundChange({ batch: batch.batch, payment: payment.payment, settlement: settlement2.settlement, serving: serving2?.serving ?? null, session: session.session, cancellations: cancellations?.cancellations ?? [], refunds: refunds2?.refunds ?? [], corrections: corrections?.corrections ?? [], returns: returns?.returns ?? [], groups, before: cashBalance(entries, session.session) }, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek batal refund tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "refund.cancelled")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.data.orderId !== change.targetId) throw new Error("Kontrak pelunasan refund tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber refund tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const d = p.data, order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), payment = version(`payment:${order}`, 0, "payment"), settlement2 = version(`settlement:${order}`, 0, "settlement");
    const pv = byKey.get(`payment:${order}`)?.find((v) => v.revision === 0);
    if (batch?.recordType !== "first-batch" || payment?.recordType !== "payment" || settlement2?.recordType !== "settlement" || !pv || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(pv.change.kind)) throw new Error("Payment asal tidak sah");
    const serving2 = version(`serving:${order}`, d.expectedServingRevision, "serving"), session = version(`cash-session:${payment.payment.cashSessionId}`, d.expectedSessionRevision, "cash-session"), cancellations = version(cancellationKey(order), d.expectedCancellationRevision, "paid-cancellations"), refunds2 = version(refundKey(order), d.expectedRefundRevision, "served-refunds"), corrections = version(correctionKey(order), d.expectedCorrectionRevision, "payment-corrections"), returns = d.returnStock === null ? void 0 : version(returnKey(order), d.returnStock?.expectedReturnRevision, "stock-returns");
    if (serving2?.recordType !== "serving" || session?.recordType !== "cash-session" || cancellations?.recordType !== "paid-cancellations" || refunds2 && refunds2.recordType !== "served-refunds" || corrections && corrections.recordType !== "payment-corrections" || returns && returns.recordType !== "stock-returns" || d.returnStock !== null && (!d.returnStock || !Array.isArray(d.returnStock.groups))) throw new Error("Sumber refund tidak lengkap");
    const groups = (d.returnStock?.groups ?? []).map((g) => {
      const record2 = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (record2?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return record2.stockGroup;
    });
    const entries = (byKey.get(`cash-session:${session.session.id}`) ?? []).filter((v) => v.revision <= d.expectedSessionRevision).sort((a, b) => a.revision - b.revision).map((v) => v.change.ledger[0]?.value).filter((e) => !!e);
    const expected = makeRefundDueChange({ batch: batch.batch, payment: payment.payment, settlement: settlement2.settlement, serving: serving2.serving, session: session.session, cancellations: cancellations.cancellations, refunds: refunds2?.refunds ?? [], corrections: corrections?.corrections ?? [], returns: returns?.returns ?? [], groups, before: cashBalance(entries, session.session) }, d, p.metadata);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek pelunasan refund tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => (c.kind === "refund.served" || c.kind === "refund.return-stock") && c.state.some((row2) => !!typed3(row2.value)))) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 1 && p.contractVersion !== 2 && p.contractVersion !== 3 || p.data.orderId !== change.targetId) throw new Error("Kontrak refund tidak sah");
    const version = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], source2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(source2?.value);
      if (revision2 !== null && (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber refund tidak sah");
      if (source2) edge(source2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const order = change.targetId, batch = version(`first-batch:${order}`, 0, "first-batch"), payment = version(`payment:${order}`, 0, "payment"), settlement2 = version(`settlement:${order}`, 0, "settlement");
    if (batch?.recordType !== "first-batch" || payment?.recordType !== "payment" || settlement2?.recordType !== "settlement") throw new Error("Payment asal tidak sah");
    const paymentVersion = byKey.get(`payment:${order}`)?.find((v) => v.revision === 0);
    if (!paymentVersion || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(paymentVersion.change.kind)) throw new Error("Jenis payment tidak didukung");
    if (changes2.some((c) => c.state.some((row2) => {
      const v = typed3(row2.value);
      return v?.recordType === "refund-history" && v.settlement.orderId === order && c.storeId === change.storeId;
    }))) throw new Error("Histori refund lama memerlukan rekonsiliasi");
    const d = p.data, isRefund = change.kind === "refund.served", refundRevision = d.expectedRefundRevision;
    const refunds2 = version(refundKey(order), refundRevision, "served-refunds");
    const returnRevision = isRefund ? d.returnStock?.expectedReturnRevision ?? null : d.expectedReturnRevision;
    const returns = isRefund && d.returnStock === null ? void 0 : version(returnKey(order), returnRevision, "stock-returns");
    const servingRevision = isRefund ? d.expectedServingRevision : 0;
    const serving2 = isRefund ? version(`serving:${order}`, servingRevision, "serving") : typed3(byKey.get(`serving:${order}`)?.find((v) => v.revision === 0)?.value);
    const correctionRevision = isRefund ? d.expectedCorrectionRevision : null;
    const corrections = isRefund ? version(correctionKey(order), correctionRevision, "payment-corrections") : void 0;
    const sessionRevision = isRefund ? d.expectedSessionRevision : p.contractVersion >= 2 ? p.sessionSource?.revision : 0;
    if (!isRefund && p.contractVersion === 2 && (p.sessionSource?.id !== payment.payment.cashSessionId || !Number.isSafeInteger(sessionRevision) || sessionRevision < 0)) throw new Error("Referensi sesi return tidak sah");
    if (p.contractVersion === 3 && (p.sourceSession?.id !== payment.payment.cashSessionId || p.sessionSource?.id !== d.executionSessionId || p.sourceSession?.revision !== d.expectedSourceRevision || p.sessionSource?.revision !== d.expectedSessionRevision || !Number.isSafeInteger(p.sourceSession?.revision) || !Number.isSafeInteger(sessionRevision))) throw new Error("Referensi sesi refund tidak sah");
    const origin = p.contractVersion === 3 ? version(`cash-session:${p.sourceSession.id}`, p.sourceSession.revision, "cash-session") : void 0;
    const sessionId = p.contractVersion === 3 ? p.sessionSource.id : payment.payment.cashSessionId;
    const session = isRefund || p.contractVersion >= 2 ? version(`cash-session:${sessionId}`, sessionRevision, "cash-session") : typed3(byKey.get(`cash-session:${sessionId}`)?.find((v) => v.revision === 0)?.value);
    if (serving2?.recordType !== "serving" || session?.recordType !== "cash-session" || refunds2 && refunds2.recordType !== "served-refunds" || returns && returns.recordType !== "stock-returns" || corrections && corrections.recordType !== "payment-corrections") throw new Error("Sumber refund tidak lengkap");
    const groupRefs = isRefund ? d.returnStock?.groups ?? [] : d.groups;
    if (!Array.isArray(groupRefs)) throw new Error("Sumber grup tidak sah");
    const groups = groupRefs.map((g) => {
      const row2 = version(`stock-group:${g.groupId}`, g.revision, "stock-group");
      if (row2?.recordType !== "stock-group") throw new Error("Sumber stok tidak sah");
      return row2.stockGroup;
    });
    const entries = (byKey.get(`cash-session:${session.session.id}`) ?? []).filter((v) => v.revision <= sessionRevision).sort((a, b) => a.revision - b.revision).map((v) => v.change.ledger[0]?.value).filter((e) => !!e);
    if (origin && origin.recordType !== "cash-session") throw new Error("Sesi asal refund tidak sah");
    const sources = { batch: batch.batch, payment: payment.payment, settlement: settlement2.settlement, serving: serving2.serving, session: session.session, refunds: refunds2?.refunds ?? [], returns: returns?.returns ?? [], corrections: corrections?.corrections ?? [], groups, refundSchemaVersion: refunds2?.schemaVersion, sessionRevision, originSession: origin?.recordType === "cash-session" ? origin.session : void 0, originRevision: p.sourceSession?.revision, before: cashBalance(entries, session.session) };
    const expected = isRefund ? makeServedRefundChange(sources, d, p.metadata) : makeStockReturnChange(sources, d, p.metadata, p.contractVersion === 2);
    if (canonical(change) !== canonical(expected)) throw new Error("Efek refund tidak sesuai sumber");
  }
  const sessionSource = (change, sessionId, version = 2) => {
    const payload = change.payload;
    if (payload?.contractVersion === void 0 && version === 2) return;
    const ref = payload.sessionSource;
    if (payload.contractVersion !== version || !ref || ref.id !== sessionId || !Number.isSafeInteger(ref.revision) || ref.revision < 0) throw new Error("Referensi sesi tidak sah");
    const source2 = byKey.get(`cash-session:${sessionId}`)?.find((v) => v.revision === ref.revision), record2 = typed3(source2?.value);
    if (!source2 || source2.change.storeId !== change.storeId || record2?.recordType !== "cash-session" || record2.session.id !== sessionId || record2.session.storeId !== change.storeId) throw new Error("Sumber sesi tidak sesuai");
    edge(source2.change.operationId, change.operationId);
    const next = byKey.get(`cash-session:${sessionId}`)?.find((v) => v.revision === ref.revision + 1);
    if (next) edge(change.operationId, next.change.operationId);
  };
  for (const change of changes2.filter((c) => c.kind === "payment.multi-batch-cash")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 2 || !p.sessionSource || !p.sources || p.data.orderId !== change.targetId || p.sessionSource.id === void 0 || p.sessionSource.revision !== p.data.expectedSessionRevision) throw new Error("Kontrak tambahan tunai tidak sah");
    const source2 = (key2, revision2, type) => {
      const versions = byKey.get(key2) ?? [], row2 = revision2 === null ? void 0 : versions.find((v) => v.revision === revision2), record2 = typed3(row2?.value);
      if (revision2 !== null && (!row2 || row2.change.storeId !== change.storeId || record2?.recordType !== type)) throw new Error("Sumber tambahan tidak sah");
      if (row2) edge(row2.change.operationId, change.operationId);
      const next = versions.find((v) => v.revision === (revision2 ?? -1) + 1);
      if (next) edge(change.operationId, next.change.operationId);
      return record2;
    };
    const first = source2(`first-batch:${change.targetId}`, p.sources.firstBatchRevision, "first-batch");
    const session = first?.recordType === "first-batch" ? source2(`cash-session:${first.batch.draft.cashSessionId}`, p.sources.sessionRevision, "cash-session") : void 0;
    const catalog = source2(`catalog:${change.storeId}`, p.sources.catalogRevision, "simple-catalog");
    const serving2 = source2(`serving:${change.targetId}`, p.sources.servingRevision, "serving");
    if (first?.recordType !== "first-batch" || first.schemaVersion !== 2 || session?.recordType !== "cash-session" || catalog?.recordType !== "simple-catalog" || p.sources.servingRevision !== null && serving2?.recordType !== "serving" || first.batch.storeId !== change.storeId || session.session.storeId !== change.storeId || p.sessionSource.id !== session.session.id) throw new Error("Sumber tambahan tidak lengkap");
    const head = { storeId: change.storeId, orderId: change.targetId, cashSessionId: session.session.id, batchCount: 1, pending: [] };
    const batchRow = change.state.find((row2) => row2.key === `order-batch:${change.targetId}:2`), batchRecord = typed3(batchRow?.value);
    if (batchRecord?.recordType !== "order-batch" || batchRow?.expectedRevision !== null || batchRecord.batch.number !== 2) throw new Error("Batch tambahan tidak sah");
    const mappings = p.sources.mappings.map((mapping) => {
      const record2 = source2(`sku-stock-mapping:${JSON.stringify([change.storeId, mapping.skuId])}`, 0, "sku-stock-mapping");
      if (record2?.recordType !== "sku-stock-mapping" || record2.mapping.groupId !== mapping.groupId) throw new Error("Pemetaan tambahan tidak sah");
      return mapping;
    });
    if (new Set(mappings.map((m) => m.skuId)).size !== mappings.length) throw new Error("Pemetaan tambahan ganda");
    const items = p.data.items.map((item) => {
      const menu = catalog.catalog.menus.find((menu2) => menu2.skuId === item.skuId && menu2.active);
      if (!menu || menu.price !== item.expectedUnitPrice) throw new Error("Katalog tambahan tidak sah");
      return { id: item.itemId, skuId: item.skuId, unitIds: item.unitIds, name: menu.name, skuPrice: menu.price, toppingPrice: 0, promo: { kind: "none", revision: 0 }, choices: [], toppings: [], serving: item.serving, note: item.note };
    });
    const rebuilt = makeAdditionalBatch(head, first.batch.draft, 2, batchRecord.batch.confirmedAt, items, mappings);
    if (canonical(rebuilt) !== canonical(batchRecord.batch)) throw new Error("Snapshot tambahan tidak sesuai sumber");
    const groups = p.sources.groups.map((group) => {
      const record2 = source2(`stock-group:${group.groupId}`, group.revision, "stock-group");
      if (record2?.recordType !== "stock-group" || record2.stockGroup.balance !== group.balance || record2.stockGroup.storeId !== change.storeId) throw new Error("Saldo tambahan tidak sah");
      return { row: { key: `stock-group:${group.groupId}`, revision: group.revision }, stock: record2.stockGroup };
    });
    if (new Set(groups.map((group) => group.stock.groupId)).size !== groups.length || canonical(groups.map((group) => group.stock.groupId).sort()) !== canonical([...new Set(mappings.map((mapping) => mapping.groupId))].sort())) throw new Error("Grup tambahan tidak sesuai");
    const additionsRow = change.state.find((row2) => row2.key === `order-additions:${change.targetId}`), additionsRecord = typed3(additionsRow?.value);
    if (additionsRecord?.recordType !== "order-additions" || additionsRow?.expectedRevision !== null) throw new Error("Head tambahan tidak sah");
    const movementPrefix = changes2.filter((other) => other.state.some((row2) => row2.key === `cash-session:${session.session.id}` && (row2.expectedRevision ?? -1) + 1 <= p.sources.sessionRevision));
    const before = cashBalance(cashMovements(movementPrefix, session.session.id), session.session);
    const expected = makeAdditionsCashChange(first.batch, rebuilt, head, serving2?.recordType === "serving" ? serving2.serving : null, session.session, p.data, p.metadata, groups, before);
    if (canonical(change) !== canonical(expected)) throw new Error("Histori tambahan tunai tidak sesuai sumber");
  }
  for (const change of changes2.filter((c) => c.kind === "draft.cancel")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 2) throw new Error("Kontrak pembatalan draft tidak sah");
    const source2 = byKey.get(`draft:${change.targetId}`)?.find((v) => v.revision === p.data.expectedRevision), draft = typed3(source2?.value), current = stateByKey.get(`draft:${change.targetId}`);
    if (!source2 || source2.change.storeId !== change.storeId || draft?.recordType !== "draft" || !current || current.revision !== p.data.expectedRevision || p.data.orderId !== change.targetId || ["first-batch", "settlement", "payment", "customer-job", "refund-history"].some((prefix2) => byKey.has(`${prefix2}:${change.targetId}`))) throw new Error("Sumber pembatalan draft tidak sah");
    sessionSource(change, draft.draft.cashSessionId);
    edge(source2.change.operationId, change.operationId);
    if (canonical(change) !== canonical(makeDraftCancellationChange(draft.draft, p.data, p.metadata, p.sessionSource))) throw new Error("Efek pembatalan draft tidak sesuai");
  }
  for (const original of changes2.filter((c) => c.kind === "batch.confirm-first" || c.kind === "payment.draft-cash" || c.kind === "settlement.draft-free" || c.kind === "payment.draft-noncash")) {
    const change = original.kind === "payment.draft-cash" ? draftCashBatchPart(original) : original.kind === "settlement.draft-free" ? draftFreeBatchPart(original) : original.kind === "payment.draft-noncash" ? draftNoncashBatchPart(original) : original;
    const p = change.payload;
    const data2 = p?.data, meta = p?.metadata, batchRow = change.state.find((s) => s.key === `first-batch:${change.targetId}`), job = change.state.find((s) => s.key === `kitchen-job:${change.targetId}`);
    const br = typed3(batchRow?.value), jr = typed3(job?.value);
    if (!data2 || !meta || !br || br.recordType !== "first-batch" || !jr || jr.recordType !== "kitchen-job" || batchRow?.expectedRevision !== null || job?.expectedRevision !== null || data2.orderId !== change.targetId || br.batch.storeId !== change.storeId || canonical(br.batch) !== canonical(jr.batch)) throw new Error("Batch atau job tidak sesuai");
    if (br.schemaVersion !== jr.schemaVersion || br.schemaVersion === 2 !== (change.payload.contractVersion === 2)) throw new Error("Versi kontrak batch tidak sesuai");
    for (const field of ["operationId", "storeId", "deviceId", "deviceEpoch", "localSequence", "actorId", "policyVersion"]) if (meta[field] !== change[field]) throw new Error("Metadata batch tidak sesuai");
    validateFirstBatch(br.batch);
    sessionSource(change, br.batch.draft.cashSessionId);
    if (typeof meta.recordedAt !== "string" || !Number.isFinite(Date.parse(meta.recordedAt)) || br.batch.draft.orderId !== data2.orderId || !Array.isArray(data2.mappings) || !Array.isArray(data2.groups)) throw new Error("Intent batch tidak sesuai");
    draftDateCode(meta.recordedAt, "UTC");
    const source2 = byKey.get(`draft:${data2.orderId}`)?.find((v) => v.revision === data2.expectedDraftRevision), current = stateByKey.get(`draft:${data2.orderId}`);
    const sourceRecord = typed3(source2?.value);
    if (!source2 || source2.change.storeId !== change.storeId || !sourceRecord || sourceRecord.recordType !== "draft" || !current || current.revision !== data2.expectedDraftRevision || canonical(snapshotBatchDraft(sourceRecord.draft)) !== canonical(br.batch.draft)) throw new Error("Sumber draft batch tidak sesuai");
    edge(source2.change.operationId, change.operationId);
    if (data2.mappings.length !== br.batch.skuGroups.length || new Set(data2.mappings.map((m) => m.skuId)).size !== data2.mappings.length) throw new Error("Pemetaan batch tidak sesuai");
    for (const mapping of br.batch.skuGroups) {
      const expected = data2.mappings.find((m) => m.skuId === mapping.skuId), sourceMapping = byKey.get(`sku-stock-mapping:${JSON.stringify([change.storeId, mapping.skuId])}`)?.find((v) => v.revision === expected?.revision), record2 = typed3(sourceMapping?.value);
      if (!expected || expected.groupId !== mapping.groupId || expected.revision !== 0 || !sourceMapping || !record2 || record2.recordType !== "sku-stock-mapping" || canonical(record2.mapping) !== canonical({ ...mapping, storeId: change.storeId })) throw new Error("Sumber pemetaan batch tidak sesuai");
      edge(sourceMapping.change.operationId, change.operationId);
    }
    const groupIds = [...new Set(br.batch.skuGroups.map((m) => m.groupId))].sort();
    if (data2.groups.length !== groupIds.length || new Set(data2.groups.map((g) => g.groupId)).size !== groupIds.length || change.state.length !== groupIds.length + 2) throw new Error("Grup batch tidak sesuai");
    const before = groupIds.map((id8) => {
      const expected = data2.groups.find((g) => g.groupId === id8), next = change.state.find((s) => s.key === `stock-group:${id8}`);
      const sourceGroup = byKey.get(`stock-group:${id8}`)?.find((v) => v.revision === expected?.revision), record2 = typed3(sourceGroup?.value), after = typed3(next?.value);
      if (!expected || !next || next.expectedRevision !== expected.revision || !sourceGroup || !record2 || record2.recordType !== "stock-group" || record2.stockGroup.storeId !== change.storeId || record2.stockGroup.balance !== expected.balance || !after || after.recordType !== "stock-group") throw new Error("Sumber stok batch tidak sesuai");
      edge(sourceGroup.change.operationId, change.operationId);
      return { expected, stock: record2.stockGroup, after: after.stockGroup };
    });
    const plan = planFirstBatch(br.batch, before.map((x) => ({ groupId: x.stock.groupId, balance: x.stock.balance })));
    if (!plan.ok) throw new Error("Stok batch tidak cukup");
    for (const item of before) {
      const debit = plan.debits.find((d) => d.groupId === item.stock.groupId);
      if (!debit || canonical(item.after) !== canonical({ ...item.stock, balance: debit.after })) throw new Error("Saldo batch tidak sesuai");
    }
    const operationId = change.operationId;
    if (canonical(change.ledger) !== canonical(plan.debits.map((debit) => ({ id: `batch-debit:${operationId}:${debit.groupId}`, operationId, value: { storeId: change.storeId, orderId: data2.orderId, ...debit } }))) || canonical(change.audit) !== canonical([{ id: `batch-audit:${operationId}`, operationId, value: { batch: br.batch, actorId: change.actorId, policyVersion: change.policyVersion } }]) || canonical(change.outbox) !== canonical({ id: `batch-outbox:${operationId}`, operationId, value: { orderId: data2.orderId } }) || canonical(change.result) !== canonical({ orderId: data2.orderId, batchNumber: 1 })) throw new Error("Efek batch tidak sesuai");
  }
  for (const change of changes2.filter((c) => c.kind === "payment.confirmed-noncash" || c.kind === "payment.draft-noncash")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 2 || !p.sessionSource || !p.methodsSource) throw new Error("Kontrak non-tunai tidak sah");
    const isDraft = change.kind === "payment.draft-noncash";
    if (isDraft && !["expectedDraftRevision,expectedMethodsRevision,expectedSessionRevision,groups,mappings,method,note,orderId,verified", "expectedDraftRevision,expectedMethodsRevision,expectedSessionRevision,groups,mappings,method,orderId,verified"].includes(Object.keys(p.data).sort().join(","))) throw new Error("Intent non-tunai tidak sah");
    const source2 = byKey.get(`first-batch:${change.targetId}`)?.find((v) => v.revision === (isDraft ? 0 : p.data.expectedBatchRevision)), batch = typed3(source2?.value);
    if (!source2 || source2.change.storeId !== change.storeId || batch?.recordType !== "first-batch" || (isDraft ? source2.change.operationId !== change.operationId : source2.change.operationId === change.operationId)) throw new Error("Sumber batch non-tunai tidak sah");
    sessionSource(change, batch.batch.draft.cashSessionId);
    edge(source2.change.operationId, change.operationId);
    const config = byKey.get(paymentMethodsKey(change.storeId))?.find((v) => v.revision === p.methodsSource.revision), methods = typed3(config?.value);
    if (p.methodsSource.id !== change.storeId || p.methodsSource.revision !== p.data.expectedMethodsRevision || !config || methods?.recordType !== "payment-methods" || methods.methods.storeId !== change.storeId || !["qris", "transfer", "ewallet"].includes(p.data.method) || methods.methods[p.data.method] !== true) throw new Error("Sumber metode tidak sah");
    edge(config.change.operationId, change.operationId);
    const next = byKey.get(paymentMethodsKey(change.storeId))?.find((v) => v.revision === p.methodsSource.revision + 1);
    if (next) edge(change.operationId, next.change.operationId);
    const data2 = isDraft ? { orderId: p.data.orderId, expectedBatchRevision: 0, expectedSessionRevision: p.data.expectedSessionRevision, expectedMethodsRevision: p.data.expectedMethodsRevision, method: p.data.method, verified: p.data.verified, ...Object.hasOwn(p.data, "note") ? { note: p.data.note } : {} } : p.data;
    const payment = makeConfirmedNoncashChange(batch.batch, data2, p.metadata, p.sessionSource, p.methodsSource);
    const expected = isDraft ? combineDraftNoncashChange(draftNoncashBatchPart(change), payment, p.data) : payment;
    if (canonical(change) !== canonical(expected)) throw new Error("Histori non-tunai tidak sesuai");
  }
  for (const change of changes2.filter((c) => c.kind === "settlement.confirmed-free" || c.kind === "settlement.draft-free")) {
    const p = change.payload;
    if (!p?.data || !p.metadata || p.contractVersion !== 2 || !p.sessionSource) throw new Error("Kontrak gratis tidak sah");
    const isDraft = change.kind === "settlement.draft-free";
    if (isDraft && Object.keys(p.data).sort().join(",") !== "expectedDraftRevision,expectedSessionRevision,groups,mappings,orderId,reason") throw new Error("Intent draft gratis tidak sah");
    const source2 = byKey.get(`first-batch:${change.targetId}`)?.find((v) => v.revision === (isDraft ? 0 : p.data.expectedBatchRevision));
    const batch = typed3(source2?.value);
    if (!source2 || source2.change.storeId !== change.storeId || batch?.recordType !== "first-batch" || (isDraft ? source2.change.operationId !== change.operationId : source2.change.operationId === change.operationId)) throw new Error("Sumber batch gratis tidak sah");
    sessionSource(change, batch.batch.draft.cashSessionId);
    edge(source2.change.operationId, change.operationId);
    const data2 = isDraft ? { orderId: p.data.orderId, expectedBatchRevision: 0, expectedSessionRevision: p.data.expectedSessionRevision, reason: p.data.reason } : p.data;
    const free = makeConfirmedFreeChange(batch.batch, data2, p.metadata, p.sessionSource);
    const expected = isDraft ? combineDraftFreeChange(draftFreeBatchPart(change), free, p.data) : free;
    if (canonical(change) !== canonical(expected)) throw new Error("Histori gratis tidak sesuai");
  }
  for (const correction of changes2.filter((c) => c.kind === "serving.correct")) {
    const d = correction.payload?.data;
    if (!d || !Array.isArray(d.unitIds) || d.expectedRevision === null) continue;
    for (const refunded of changes2.filter((c) => c.kind === "refund.served" && c.targetId === correction.targetId && c.storeId === correction.storeId)) {
      const rd = refunded.payload?.data;
      const row2 = refunded.state.find((r) => r.key === refundKey(correction.targetId)), record2 = typed3(row2?.value);
      const event2 = record2?.recordType === "served-refunds" ? record2.refunds.at(-1) : void 0;
      if (rd && Number.isSafeInteger(rd.expectedServingRevision) && rd.expectedServingRevision <= d.expectedRevision && event2?.units.some((u) => d.unitIds.includes(u.id))) throw new Error("Unit direfund tidak dapat dikoreksi kembali");
    }
  }
  const pending = [];
  for (const [key2, versions] of byKey) {
    versions.sort((a, b) => a.revision - b.revision);
    let previous;
    let owner;
    const cashEntries = [];
    const retiredUnits = /* @__PURE__ */ new Set(), retiredItems = /* @__PURE__ */ new Set();
    for (let i = 0; i < versions.length; i++) {
      const v = versions[i];
      if (i) edge(versions[i - 1].change.operationId, v.change.operationId);
      const current = typed3(v.value);
      if (previous && (!current || current.recordType !== previous.recordType || v.change.storeId !== owner)) throw new Error("Transisi record bisnis tidak sah");
      if (!current) continue;
      if (!owner) owner = v.change.storeId;
      if (v.change.storeId !== owner) throw new Error("Toko record berubah");
      if (v.change.kind === "payment.multi-batch-cash") {
        const p = v.change.payload;
        if (p?.contractVersion !== 2 || p.data?.orderId !== v.change.targetId || v.change.state.some((row2) => typed3(row2.value)?.recordType === "order-additions" && row2.key !== `order-additions:${v.change.targetId}`) || v.change.state.some((row2) => typed3(row2.value)?.recordType === "order-batch" && row2.key !== `order-batch:${v.change.targetId}:2`) || v.change.state.some((row2) => typed3(row2.value)?.recordType === "kitchen-job-addition" && row2.key !== `kitchen-job:${v.change.targetId}:2`)) throw new Error("Histori tambahan tunai tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "simple-catalog") {
        if (key2 !== `catalog:${owner}` || !["catalog.category-create", "catalog.simple-create"].includes(v.change.kind) || current.catalog.storeId !== owner) {
          throw new Error("Histori katalog tidak sah");
        }
        previous = current;
        continue;
      }
      if (current.recordType === "cash-count") {
        if (!v.change.kind.startsWith("cash-count.") || key2 !== `cash-count:${current.history.sessionId}` || current.history.storeId !== owner) throw new Error("Histori hitungan tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "unpaid-cancellation") {
        if (v.revision !== 0 || v.change.kind !== "cancellation.unpaid" || key2 !== unpaidCancellationKey(v.change.targetId)) throw new Error("Histori pembatalan unpaid tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "unpaid-stock-returns") {
        const c = v.change, p = c.payload;
        const revision2 = c.kind === "cancellation.unpaid" ? p?.data?.returnStock?.expectedReturnRevision : p?.data?.expectedReturnRevision;
        if (!["cancellation.unpaid", "return.unpaid"].includes(c.kind) || key2 !== unpaidReturnKey(c.targetId) || revision2 !== (v.revision === 0 ? null : v.revision - 1) || current.returns.length !== v.revision + 1 || previous && (previous.recordType !== "unpaid-stock-returns" || canonical(current.returns.slice(0, -1)) !== canonical(previous.returns))) throw new Error("Histori return unpaid tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "draft-cancellation") {
        if (v.revision !== 0 || v.change.kind !== "draft.cancel" || key2 !== `draft-cancellation:${current.cancellation.orderId}`) throw new Error("Histori pembatalan draft tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "free-cancellations") {
        const c = v.change, p = c.payload;
        if (c.kind !== "cancellation.free" || key2 !== freeCancellationKey(c.targetId) || !p?.data || p.data.expectedCancellationRevision !== (v.revision === 0 ? null : v.revision - 1) || current.cancellations.length !== v.revision + 1 || previous && (previous.recordType !== "free-cancellations" || canonical(current.cancellations.slice(0, -1)) !== canonical(previous.cancellations))) throw new Error("Histori pembatalan gratis tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "free-stock-returns") {
        const c = v.change, p = c.payload;
        const rev2 = c.kind === "cancellation.free" ? p?.data?.returnStock?.expectedReturnRevision : p?.data?.expectedReturnRevision;
        if (!["cancellation.free", "return.free"].includes(c.kind) || key2 !== freeReturnKey(c.targetId) || rev2 !== (v.revision === 0 ? null : v.revision - 1) || current.returns.length !== v.revision + 1 || previous && (previous.recordType !== "free-stock-returns" || canonical(current.returns.slice(0, -1)) !== canonical(previous.returns))) throw new Error("Histori return gratis tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "paid-cancellations") {
        const c = v.change, p = c.payload;
        if (!["cancellation.paid", "cancellation.refund-paid"].includes(c.kind) || key2 !== cancellationKey(c.targetId) || !p?.data || p.data.expectedCancellationRevision !== (v.revision === 0 ? null : v.revision - 1) || current.cancellations.length !== v.revision + 1 || previous && (previous.recordType !== "paid-cancellations" || canonical(current.cancellations.slice(0, -1)) !== canonical(previous.cancellations))) throw new Error("Histori pembatalan tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "served-refunds") {
        const c = v.change, p = c.payload;
        if (!["refund.served", "refund.cancelled", "cancellation.refund-paid"].includes(c.kind) || key2 !== refundKey(c.targetId) || !p?.data || p.data.expectedRefundRevision !== (v.revision === 0 ? null : v.revision - 1) || current.refunds.length !== v.revision + 1 || previous && (previous.recordType !== "served-refunds" || canonical(current.refunds.slice(0, -1)) !== canonical(previous.refunds))) throw new Error("Histori refund tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "stock-returns") {
        const c = v.change, p = c.payload;
        const revision2 = ["cancellation.paid", "cancellation.refund-paid"].includes(c.kind) ? p?.data?.returnStock?.expectedReturnRevision : c.kind === "refund.cancelled" ? p?.data?.returnStock?.expectedReturnRevision : c.kind === "refund.served" ? p?.data?.returnStock?.expectedReturnRevision : p?.data?.expectedReturnRevision;
        if (!["refund.served", "refund.return-stock", "cancellation.paid", "refund.cancelled", "cancellation.refund-paid", "cancellation.return-stock"].includes(c.kind) || key2 !== returnKey(c.targetId) || revision2 !== (v.revision === 0 ? null : v.revision - 1) || current.returns.length !== v.revision + 1 || previous && (previous.recordType !== "stock-returns" || canonical(current.returns.slice(0, -1)) !== canonical(previous.returns))) throw new Error("Histori return tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "payment-corrections") {
        const c = v.change, p = c.payload;
        if (!["payment.correct-method", "payment.adjust-closed-method"].includes(c.kind) || c.state.length !== 2 || c.state.filter((row2) => typed3(row2.value)?.recordType === "cash-session").length !== 1 || !p?.data || key2 !== correctionKey(c.targetId) || p.data.orderId !== c.targetId || p.data.expectedRevision !== (v.revision === 0 ? null : v.revision - 1) || current.corrections.length !== v.revision + 1 || previous && (previous.recordType !== "payment-corrections" || canonical(current.corrections.slice(0, -1)) !== canonical(previous.corrections))) throw new Error("Histori koreksi tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "payment-methods") {
        const c = v.change, p = c.payload;
        const before = previous?.recordType === "payment-methods" ? previous.methods : null;
        if (c.kind !== "payment-methods.set" || key2 !== paymentMethodsKey(owner) || current.methods.storeId !== owner || !p?.data || !p.metadata || p.data.expectedRevision !== (v.revision === 0 ? null : v.revision - 1) || canonical(c) !== canonical(makePaymentMethodsChange(p.data, p.metadata, before))) throw new Error("Histori metode tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "serving") {
        if (["cancellation.paid", "cancellation.refund-paid", "cancellation.free", "cancellation.unpaid"].includes(v.change.kind)) {
          if (key2 !== `serving:${v.change.targetId}` || current.schemaVersion !== 2) throw new Error("Penyajian pembatalan tidak sah");
          previous = current;
          continue;
        }
        const c = v.change, p = c.payload, action = c.kind === "serving.serve" ? "serve" : c.kind === "serving.correct" ? "correct" : null;
        const source2 = byKey.get(`first-batch:${current.serving.orderId}`)?.find((x) => x.revision === 0), batch = typed3(source2?.value);
        if (!action || !p?.data || !p.metadata || !source2 || batch?.recordType !== "first-batch" || source2.change.storeId !== owner || key2 !== `serving:${current.serving.orderId}` || p.data.expectedRevision !== (v.revision === 0 ? null : v.revision - 1)) throw new Error("Histori penyajian tidak sah");
        const before = previous?.recordType === "serving" ? previous.serving : null;
        if (v.revision > 0 && !before) throw new Error("Sumber penyajian hilang");
        if (p.contractVersion !== 1 && p.contractVersion !== 2) throw new Error("Versi penyajian tidak sah");
        sessionSource(c, batch.batch.draft.cashSessionId, p.contractVersion);
        edge(source2.change.operationId, c.operationId);
        let refundSource;
        if (p.contractVersion === 2) {
          const rev2 = p.refundRevision;
          if (rev2 !== null && (!Number.isSafeInteger(rev2) || rev2 < 0)) throw new Error("Revisi refund tidak sah");
          const versions2 = byKey.get(refundKey(c.targetId)) ?? [], prior = rev2 === null ? void 0 : versions2.find((x) => x.revision === rev2), record2 = typed3(prior?.value);
          if (rev2 !== null && (!prior || prior.change.storeId !== owner || record2?.recordType !== "served-refunds")) throw new Error("Sumber refund tidak sah");
          if (prior) edge(prior.change.operationId, c.operationId);
          const next = versions2.find((x) => x.revision === (rev2 ?? -1) + 1);
          if (next) edge(c.operationId, next.change.operationId);
          refundSource = { revision: rev2 ?? null, unitIds: record2?.recordType === "served-refunds" ? record2.refunds.flatMap((r) => r.units.map((u) => u.id)) : [] };
        }
        const additionSource = byKey.get(`order-batch:${c.targetId}:2`)?.find((x) => x.revision === 0);
        const addition = additionSource && additionSource.change.storeId === c.storeId && additionSource.change.deviceId === c.deviceId && additionSource.change.deviceEpoch === c.deviceEpoch && additionSource.change.localSequence < c.localSequence ? typed3(additionSource.value) : void 0;
        if (addition && addition.recordType !== "order-batch") throw new Error("Sumber batch tambahan tidak sah");
        if (canonical(c) !== canonical(makeServingChange(batch.batch, before, p.data, p.metadata, action, p.sessionSource, refundSource, addition?.recordType === "order-batch" ? addition.batch : null))) throw new Error("Histori penyajian tidak sesuai");
        previous = current;
        continue;
      }
      if (current.recordType === "first-batch" || current.recordType === "kitchen-job") {
        if (v.revision !== 0 || i !== 0 || !["batch.confirm-first", "payment.draft-cash", "settlement.draft-free", "payment.draft-noncash"].includes(v.change.kind) || key2 !== `${current.recordType}:${current.batch.draft.orderId}`) throw new Error("Histori batch tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "sku-stock-mapping") {
        if (v.change.kind === "catalog.simple-create") {
          previous = current;
          continue;
        }
        const m = current.mapping, c = v.change, p = c.payload;
        const target = stateByKey.get(`stock-group:${m.groupId}`), group = typed3(target?.value);
        if (v.revision !== 0 || i !== 0 || key2 !== `sku-stock-mapping:${JSON.stringify([m.storeId, m.skuId])}` || c.kind !== "mapping.create" || c.targetId !== m.skuId || m.storeId !== owner || c.state.length !== 1 || c.ledger.length !== 0 || c.audit.length !== 1 || !p?.metadata || canonical(p.data) !== canonical({ skuId: m.skuId, groupId: m.groupId }) || !group || group.recordType !== "stock-group" || group.stockGroup.storeId !== m.storeId) throw new Error("Histori pemetaan tidak sah");
        for (const field of ["operationId", "storeId", "deviceId", "deviceEpoch", "localSequence", "actorId", "policyVersion"]) if (p.metadata[field] !== c[field]) throw new Error("Metadata pemetaan tidak sesuai");
        const audit = c.audit[0].value;
        if (!audit || typeof audit.recordedAt !== "string" || !Number.isFinite(Date.parse(audit.recordedAt)) || typeof p.metadata.recordedAt !== "string" || !Number.isFinite(Date.parse(p.metadata.recordedAt))) throw new Error("Waktu pemetaan tidak sah");
        if (canonical(c.audit) !== canonical([{ id: `mapping-audit:${c.operationId}`, operationId: c.operationId, value: { mapping: m, actorId: c.actorId, policyVersion: c.policyVersion, occurredAt: p.metadata.recordedAt, recordedAt: audit.recordedAt } }]) || canonical(c.outbox) !== canonical({ id: `mapping-outbox:${c.operationId}`, operationId: c.operationId, value: { skuId: m.skuId } }) || canonical(c.result) !== canonical({ mapping: m, revision: 0 })) throw new Error("Histori pemetaan tidak sesuai");
        const source2 = byKey.get(`stock-group:${m.groupId}`)?.find((x) => x.revision === 0);
        if (!source2) throw new Error("Grup asal tidak ada");
        edge(source2.change.operationId, c.operationId);
        previous = current;
        continue;
      }
      if (current.recordType === "stock-group") {
        if (v.change.kind === "catalog.simple-create") {
          previous = current;
          continue;
        }
        const g = current.stockGroup, change = v.change, prev = previous?.recordType === "stock-group" ? previous.stockGroup : null;
        if (change.kind === "batch.confirm-first" || change.kind === "payment.draft-cash" || change.kind === "settlement.draft-free" || change.kind === "payment.draft-noncash" || change.kind === "refund.served" || change.kind === "refund.return-stock" || change.kind === "cancellation.paid" || change.kind === "refund.cancelled" || change.kind === "cancellation.refund-paid" || change.kind === "cancellation.return-stock" || change.kind === "cancellation.free" || change.kind === "return.free" || change.kind === "cancellation.unpaid" || change.kind === "return.unpaid") {
          if (!prev) throw new Error("Stok tanpa sumber");
          previous = current;
          continue;
        }
        const action = v.revision === 0 ? "opening" : change.kind === "stock.correction" ? "correction" : change.kind === "stock.minimum" ? "minimum" : change.kind === "stock.in" ? "in" : null;
        const p = change.payload;
        const data2 = p?.data, meta = p?.metadata;
        if (!action || change.kind !== `stock.${action}` || change.targetId !== g.groupId || key2 !== `stock-group:${g.groupId}` || g.storeId !== owner || change.state.length !== 1 || change.audit.length !== 1 || !data2 || !meta || p?.action !== action || data2.groupId !== g.groupId || v.revision > 0 && !prev) throw new Error("Operasi stok tidak sah");
        for (const field of ["operationId", "storeId", "deviceId", "deviceEpoch", "localSequence", "actorId", "policyVersion"]) if (meta[field] !== change[field]) throw new Error("Metadata stok tidak sesuai");
        if (typeof meta.recordedAt !== "string" || !Number.isFinite(Date.parse(meta.recordedAt)) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(meta.recordedAt)) throw new Error("Waktu stok tidak sah");
        if (prev && (prev.storeId !== g.storeId || prev.groupId !== g.groupId || data2.expectedRevision !== v.revision - 1 || data2.expectedBalance !== prev.balance)) throw new Error("Identitas atau versi stok berubah");
        if (action === "opening" && (g.baseline !== g.balance || data2.balance !== g.balance || g.minimum !== (data2.minimum ?? 5))) throw new Error("Opening stok tidak sah");
        if (action === "correction" && (!prev || typeof data2.reason !== "string" || !data2.reason.trim() || data2.value !== g.balance || g.baseline !== g.balance || g.minimum !== prev.minimum)) throw new Error("Koreksi stok tidak sah");
        if (action === "in" && (!prev || typeof data2.quantity !== "number" || !Number.isSafeInteger(data2.quantity) || data2.quantity <= 0 || !Number.isSafeInteger(prev.balance + data2.quantity) || g.balance !== prev.balance + data2.quantity || g.baseline !== prev.baseline || g.minimum !== prev.minimum || typeof data2.reason !== "string" || !data2.reason.trim() || Object.keys(data2).sort().join(",") !== "expectedBalance,expectedRevision,groupId,quantity,reason")) throw new Error("Stok masuk tidak sah");
        if (action === "minimum" && (!prev || data2.value !== g.minimum || g.balance !== prev.balance || g.baseline !== prev.baseline)) throw new Error("Minimal stok tidak sah");
        const audit = change.audit[0].value;
        if (!audit || typeof audit.recordedAt !== "string" || !Number.isFinite(Date.parse(audit.recordedAt)) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(audit.recordedAt)) throw new Error("Waktu audit stok tidak sah");
        const expectedAudit = { action, groupId: g.groupId, actorId: change.actorId, policyVersion: change.policyVersion, occurredAt: meta.recordedAt, recordedAt: audit.recordedAt, before: prev, after: g, reason: action === "correction" || action === "in" ? data2.reason : null };
        const expectedLedger = action === "minimum" ? [] : [{ id: `stock-ledger:${change.operationId}`, operationId: change.operationId, value: { action, groupId: g.groupId, storeId: g.storeId, delta: g.balance - (prev?.balance ?? 0), before: prev?.balance ?? 0, after: g.balance } }];
        if (canonical(change.audit) !== canonical([{ id: `stock-audit:${change.operationId}`, operationId: change.operationId, value: expectedAudit }]) || canonical(change.ledger) !== canonical(expectedLedger) || canonical(change.outbox) !== canonical({ id: `stock-outbox:${change.operationId}`, operationId: change.operationId, value: { groupId: g.groupId } }) || canonical(change.result) !== canonical({ groupId: g.groupId, revision: v.revision, stockGroup: g })) throw new Error("Histori stok tidak sesuai");
        previous = current;
        continue;
      }
      if (current.recordType === "customer-job" && current.schemaVersion === 2) {
        const c = v.change, order = current.settlement.orderId;
        if (v.revision !== 0 || !["settlement.confirmed-free", "settlement.draft-free"].includes(c.kind) || c.targetId !== order || key2 !== `customer-job:${order}` || current.batch.storeId !== owner) throw new Error("Histori job gratis tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "payment" || current.recordType === "customer-job") {
        const c = v.change, order = current.payment.orderId;
        if (current.recordType === "payment" && current.schemaVersion === 2 || current.recordType === "customer-job" && current.schemaVersion === 3) {
          if (v.revision !== 0 || !["payment.confirmed-noncash", "payment.draft-noncash"].includes(c.kind) || c.targetId !== order || key2 !== `${current.recordType}:${order}` || current.payment.storeId !== owner) throw new Error("Histori non-tunai tidak sah");
          previous = current;
          continue;
        }
        if (v.revision !== 0 || !["payment.confirmed-cash", "payment.draft-cash"].includes(c.kind) || c.targetId !== order || key2 !== `${current.recordType}:${order}` || current.payment.storeId !== owner || !c.state.some((row2) => row2.key === `cash-session:${current.payment.cashSessionId}` && typed3(row2.value)?.recordType === "cash-session")) throw new Error("Histori pembayaran tidak sah");
        previous = current;
        continue;
      }
      if (current.recordType === "cash-session") {
        const session = current.session, change = v.change;
        if (change.kind.startsWith("cash-count.")) {
          if (previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || key2 !== `cash-session:${session.id}`) throw new Error("Sesi hitungan tidak sah");
          previous = current;
          continue;
        }
        if (change.kind === "refund.served" || change.kind === "refund.cancelled" || change.kind === "cancellation.refund-paid") {
          const data3 = change.payload?.data;
          if (previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || data3?.expectedSessionRevision !== v.revision - 1 || key2 !== `cash-session:${session.id}`) throw new Error("Sesi refund tidak sah");
          cashEntries.push(change.ledger[0].value);
          cashBalance(cashEntries, session);
          previous = current;
          continue;
        }
        if (change.kind === "payment.adjust-closed-method") {
          const p = change.payload;
          const source2 = byKey.get(`payment:${change.targetId}`)?.find((x) => x.revision === 0), payment = typed3(source2?.value);
          const batchSource = byKey.get(`first-batch:${change.targetId}`)?.find((x) => x.revision === 0), batch = typed3(batchSource?.value);
          const origin = byKey.get(`cash-session:${p?.sourceSession?.id}`)?.find((x) => x.revision === p?.sourceSession?.revision), originRecord = typed3(origin?.value);
          const prior = p?.data?.expectedRevision === null ? void 0 : byKey.get(correctionKey(change.targetId))?.find((x) => x.revision === p?.data?.expectedRevision), history2 = typed3(prior?.value);
          if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.paymentSource?.id !== `payment:${change.targetId}` || p.paymentSource.revision !== 0 || !source2 || source2.change.storeId !== owner || payment?.recordType !== "payment" || !batchSource || batchSource.change.storeId !== owner || batch?.recordType !== "first-batch" || batch.batch.draft.channel !== "store" || batch.batch.draft.orderId !== payment.payment.orderId || batch.batch.draft.cashSessionId !== payment.payment.cashSessionId || batch.batch.storeId !== owner || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(source2.change.kind) || !origin || origin.change.kind !== "cash-count.close" || origin.change.storeId !== owner || originRecord?.recordType !== "cash-session" || p.sourceSession.id !== payment.payment.cashSessionId || p.sourceSession.revision !== p.data.expectedSourceRevision || previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || p.data.expectedSessionRevision !== v.revision - 1 || p.sessionSource?.id !== session.id || p.sessionSource.revision !== v.revision - 1 || key2 !== `cash-session:${session.id}` || p.data.expectedRevision !== null && (!prior || history2?.recordType !== "payment-corrections")) throw new Error("Sumber penyesuaian tidak sah");
          edge(source2.change.operationId, change.operationId);
          edge(batchSource.change.operationId, change.operationId);
          edge(origin.change.operationId, change.operationId);
          if (prior) edge(prior.change.operationId, change.operationId);
          const before2 = cashBalance(cashEntries, session);
          if (canonical(change) !== canonical(makeClosedPaymentAdjustmentChange(payment.payment, originRecord.session, session, history2?.recordType === "payment-corrections" ? history2.corrections : [], p.data, p.metadata, before2))) throw new Error("Histori penyesuaian tidak sesuai");
          cashEntries.push(change.ledger[0].value);
          cashBalance(cashEntries, session);
          previous = current;
          continue;
        }
        if (change.kind === "payment.correct-method") {
          const p = change.payload;
          const source2 = byKey.get(`payment:${change.targetId}`)?.find((x) => x.revision === p?.paymentSource?.revision), payment = typed3(source2?.value);
          const prior = p?.data?.expectedRevision === null ? void 0 : byKey.get(correctionKey(change.targetId))?.find((x) => x.revision === p?.data?.expectedRevision), history2 = typed3(prior?.value);
          if (!p?.data || !p.metadata || p.contractVersion !== 1 || p.paymentSource?.id !== `payment:${change.targetId}` || p.paymentSource.revision !== 0 || !source2 || payment?.recordType !== "payment" || source2.change.storeId !== owner || !["payment.confirmed-cash", "payment.draft-cash", "payment.confirmed-noncash", "payment.draft-noncash"].includes(source2.change.kind) || previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || p.data.expectedSessionRevision !== v.revision - 1 || p.sessionSource?.id !== session.id || p.sessionSource.revision !== v.revision - 1 || key2 !== `cash-session:${session.id}` || p.data.expectedRevision !== null && (!prior || history2?.recordType !== "payment-corrections")) throw new Error("Sumber koreksi tidak sah");
          edge(source2.change.operationId, change.operationId);
          if (prior) edge(prior.change.operationId, change.operationId);
          const before2 = cashBalance(cashEntries, session);
          if (canonical(change) !== canonical(makePaymentCorrectionChange(payment.payment, session, history2?.recordType === "payment-corrections" ? history2.corrections : [], p.data, p.metadata, before2))) throw new Error("Histori koreksi tidak sesuai");
          cashEntries.push(change.ledger[0].value);
          cashBalance(cashEntries, session);
          previous = current;
          continue;
        }
        if (change.kind === "payment.draft-cash") {
          const payload2 = change.payload;
          const batchRow = change.state.find((x) => x.key === `first-batch:${change.targetId}`), batch = typed3(batchRow?.value);
          if (!payload2 || payload2.contractVersion !== 2 || !payload2.data || Object.keys(payload2.data).sort().join(",") !== "expectedDraftRevision,expectedSessionRevision,groups,mappings,orderId,received" || !payload2.metadata || batch?.recordType !== "first-batch" || previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || payload2.data.expectedSessionRevision !== v.revision - 1 || key2 !== `cash-session:${session.id}`) throw new Error("Sumber pembayaran draft tidak sah");
          const before2 = cashBalance(cashEntries, session);
          const payment = makeConfirmedCashPaymentChange(batch.batch, session, { orderId: payload2.data.orderId, expectedBatchRevision: 0, expectedSessionRevision: payload2.data.expectedSessionRevision, received: payload2.data.received }, payload2.metadata, before2);
          if (canonical(change) !== canonical(combineDraftCashChange(draftCashBatchPart(change), payment, payload2.data))) throw new Error("Histori pembayaran draft tidak sesuai");
          cashEntries.push(change.ledger[0].value);
          cashBalance(cashEntries, session);
          previous = current;
          continue;
        }
        if (change.kind === "payment.confirmed-cash") {
          const payload2 = change.payload;
          const source2 = byKey.get(`first-batch:${change.targetId}`)?.find((x) => x.revision === payload2?.data?.expectedBatchRevision), batch = typed3(source2?.value);
          if (!payload2 || payload2.contractVersion !== 1 || !payload2.data || !payload2.metadata || !source2 || batch?.recordType !== "first-batch" || source2.change.storeId !== owner || previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || payload2.data.expectedSessionRevision !== v.revision - 1 || key2 !== `cash-session:${session.id}`) throw new Error("Sumber pembayaran tidak sah");
          edge(source2.change.operationId, change.operationId);
          const before2 = cashBalance(cashEntries, session);
          if (canonical(change) !== canonical(makeConfirmedCashPaymentChange(batch.batch, session, payload2.data, payload2.metadata, before2))) throw new Error("Histori pembayaran tidak sesuai");
          cashEntries.push(change.ledger[0].value);
          cashBalance(cashEntries, session);
          previous = current;
          continue;
        }
        const payload = change.payload;
        const data2 = payload?.data, meta = payload?.metadata, opening = v.revision === 0;
        if (!data2 || !meta || key2 !== `cash-session:${session.id}` || session.storeId !== owner || change.targetId !== session.id || change.kind !== (opening ? "cash.open" : "cash.move") || change.state.length !== 1 || (opening ? Object.keys(data2).sort().join(",") !== "initialCustodian,number,openingAmount,sessionId,timeZone" : Object.keys(data2).sort().join(",") !== "amount,category,description,expectedRevision,kind,sessionId") || data2.sessionId !== session.id) throw new Error("Operasi kas tidak sah");
        for (const field of ["operationId", "storeId", "deviceId", "deviceEpoch", "localSequence", "actorId", "policyVersion"]) if (meta[field] !== change[field]) throw new Error("Metadata kas tidak sesuai");
        if (!opening && payload.previousClose !== void 0) throw new Error("Sumber sesi tidak sah");
        if (opening) {
          const d = data2;
          if (d.number !== session.number || d.initialCustodian !== session.initialCustodian || d.openingAmount !== session.openingAmount || d.timeZone !== session.timeZone || session.openedBy !== meta.actorId || session.openedAt !== meta.recordedAt) throw new Error("Pembukaan kas tidak sesuai");
        } else if (previous?.recordType !== "cash-session" || canonical(previous.session) !== canonical(session) || data2.expectedRevision !== v.revision - 1) throw new Error("Revisi sesi kas tidak sesuai");
        const before = opening ? 0 : cashBalance(cashEntries, session);
        if (canonical(change) !== canonical(makeCashChange(session, data2, meta, opening ? null : v.revision - 1, before, payload.previousClose))) throw new Error("Histori kas tidak sesuai");
        cashEntries.push(change.ledger[0].value);
        cashBalance(cashEntries, session);
        previous = current;
        continue;
      }
      if (current.recordType === "draft") {
        const d = current.draft, order = JSON.stringify([owner, d.orderId]);
        const change = v.change;
        if (current.schemaVersion === 2 !== (change.payload?.contractVersion === 2)) throw new Error("Versi kontrak draft tidak sesuai");
        if (previous?.recordType === "draft" && previous.schemaVersion === 2 && current.schemaVersion !== 2) throw new Error("Versi kontrak draft mundur");
        sessionSource(change, d.cashSessionId);
        if (change.kind !== (v.revision === 0 ? "draft.create" : "draft.update") || change.targetId !== d.orderId || key2 !== `draft:${d.orderId}` || change.state.length !== 1 || change.ledger.length !== 0 || change.audit.length !== 1) throw new Error("Operasi draft tidak sah");
        const payload = change.payload;
        const catalogPayload = payload;
        if (catalogPayload.catalogSource) {
          const source2 = byKey.get(`catalog:${owner}`)?.find((x) => x.revision === catalogPayload.catalogSource.revision), catalog = typed3(source2?.value);
          if (!source2 || catalog?.recordType !== "simple-catalog" || catalogPayload.catalogSource.storeId !== owner || catalogPayload.data?.expectedCatalogRevision !== source2.revision || !Array.isArray(catalogPayload.data.items) || catalogPayload.data.items.length !== d.items.length) throw new Error("Sumber katalog draft tidak sah");
          edge(source2.change.operationId, change.operationId);
          for (let n = 0; n < d.items.length; n++) {
            const input = catalogPayload.data.items[n], item = d.items[n], menu = catalog.catalog.menus.find((m) => m.skuId === input.skuId);
            if (!menu?.active || menu.price !== input.expectedUnitPrice || item.id !== input.itemId || item.skuId !== input.skuId || item.name !== menu.name || item.skuPrice !== menu.price || canonical(item.unitIds) !== canonical(input.unitIds) || item.serving !== input.serving || item.note !== input.note || item.toppingPrice !== 0 || item.promo.kind !== "none" || item.promo.revision !== 0 || item.choices.length || item.toppings.length) throw new Error("Snapshot katalog draft tidak sesuai");
          }
          if (d.channel !== "store" || d.channelAccountId || d.externalOrderId || d.discount.kind !== "none" || d.taxBp !== 0 || d.serviceBp !== 0) throw new Error("Kontrak draft katalog tidak sesuai");
        }
        if (!payload || typeof payload !== "object" || !("metadata" in payload) || !payload.metadata || typeof payload.metadata !== "object" || !("recordedAt" in payload.metadata) || !("storeTimeZone" in payload.metadata) || typeof payload.metadata.recordedAt !== "string" || typeof payload.metadata.storeTimeZone !== "string") throw new Error("Metadata draft tidak sah");
        draftDateCode(payload.metadata.recordedAt, payload.metadata.storeTimeZone);
        const audit = { action: v.revision === 0 ? "create" : "update", orderId: d.orderId, actorId: change.actorId, policyVersion: change.policyVersion, occurredAt: payload.metadata.recordedAt, recordedAt: d.savedAt, before: previous?.recordType === "draft" ? previous.draft : null, after: d };
        if (canonical(change.audit[0].value) !== canonical(audit)) throw new Error("Audit draft tidak sesuai");
        if (v.revision === 0) {
          const prefix2 = `${draftDateCode(d.savedAt, payload.metadata.storeTimeZone)}-E${change.deviceEpoch}-`;
          if (!d.displayNumber.startsWith(prefix2)) throw new Error("Nomor draft tidak sesuai waktu atau epoch");
          const digits = d.displayNumber.slice(prefix2.length), number = Number(digits);
          if (!Number.isSafeInteger(number) || number < 1 || digits !== String(number).padStart(4, "0")) throw new Error("Nomor draft tidak sah");
          const group = JSON.stringify([owner, prefix2]), numbers = draftSequences.get(group) ?? /* @__PURE__ */ new Set();
          numbers.add(number);
          draftSequences.set(group, numbers);
        }
        unique(draftOrders, order, key2);
        unique(draftNumbers, JSON.stringify([owner, d.displayNumber]), order);
        if (d.channel !== "store") unique(platformIds, JSON.stringify([owner, d.channel, d.channelAccountId, d.externalOrderId]), order);
        const currentUnits = new Set(d.items.flatMap((item) => item.unitIds)), currentItems = new Set(d.items.map((item) => item.id));
        for (const item of d.items) {
          unique(draftItems, JSON.stringify([owner, item.id]), order);
          if (retiredItems.has(item.id)) throw new Error("ID item yang dihapus digunakan kembali");
          for (const id8 of item.unitIds) {
            unique(draftUnits, JSON.stringify([owner, id8]), order);
            if (retiredUnits.has(id8)) throw new Error("ID unit yang dihapus digunakan kembali");
          }
        }
        if (previous?.recordType === "draft") for (const item of previous.draft.items) {
          if (!currentItems.has(item.id)) retiredItems.add(item.id);
          for (const id8 of item.unitIds) if (!currentUnits.has(id8)) retiredUnits.add(id8);
        }
        if (previous && previous.recordType === "draft" && (current.draft.orderId !== previous.draft.orderId || current.draft.displayNumber !== previous.draft.displayNumber || current.draft.cashSessionId !== previous.draft.cashSessionId)) throw new Error("Identitas draft berubah");
        if (i > 0 && !previous) throw new Error("Record generik bukan draft");
        previous = current;
        continue;
      }
      if (current.recordType === "order-additions" || current.recordType === "order-batch" || current.recordType === "kitchen-job-addition") {
        previous = current;
        continue;
      }
      if (current.recordType !== "settlement" && current.recordType !== "refund-history") throw new Error("Record bisnis tidak didukung");
      const identity = JSON.stringify([owner, current.settlement.orderId]);
      if (current.recordType === "settlement" && ["payment.confirmed-cash", "payment.draft-cash"].includes(v.change.kind) && (key2 !== `settlement:${current.settlement.orderId}` || v.revision !== 0 || !v.change.state.some((row2) => row2.key.startsWith("cash-session:") && typed3(row2.value)?.recordType === "cash-session"))) throw new Error("Settlement pembayaran tidak sah");
      if (previous && (previous.recordType === "settlement" || previous.recordType === "refund-history") && canonical(current.settlement) !== canonical(previous.settlement)) throw new Error("Settlement immutable");
      if (current.recordType === "settlement") {
        const existing = settlements.get(identity);
        if (existing && existing.key !== key2) throw new Error("Settlement duplikat");
        if (!existing) settlements.set(identity, { key: key2, value: current, operationId: v.change.operationId });
      } else {
        const existing = refunds.get(identity);
        if (existing && existing !== key2) throw new Error("Histori refund duplikat");
        refunds.set(identity, key2);
        if (previous && previous.recordType === "refund-history" && (current.refunds.length < previous.refunds.length || previous.refunds.some((entry, j) => canonical(entry) !== canonical(current.refunds[j])))) throw new Error("Histori refund harus bertambah");
        pending.push({ identity, record: current, operationId: v.change.operationId });
      }
      previous = current;
    }
    const last = versions[versions.length - 1], actual = stateByKey.get(key2);
    if (!actual || actual.revision !== last.revision || canonical(actual.value) !== canonical(last.value)) throw new Error("State tidak sesuai histori");
  }
  for (const numbers of draftSequences.values()) for (let i = 1; i <= numbers.size; i++) if (!numbers.has(i)) throw new Error("Urutan nomor draft tidak lengkap");
  for (const identity of draftOrders.keys()) {
    const settlement2 = settlements.get(identity);
    if (refunds.has(identity) || settlement2 && !["payment.confirmed-cash", "payment.draft-cash", "payment.multi-batch-cash", "settlement.confirmed-free", "settlement.draft-free", "payment.confirmed-noncash", "payment.draft-noncash"].includes(changes2.find((c) => c.operationId === settlement2.operationId)?.kind ?? "")) throw new Error("Draft sudah memiliki settlement");
  }
  for (const row2 of state) if (typed3(row2.value) && !byKey.has(row2.key)) throw new Error("Record bisnis tanpa receipt");
  for (const item of pending) {
    const source2 = settlements.get(item.identity);
    if (!source2 || canonical(source2.value.recordType === "settlement" || source2.value.recordType === "refund-history" ? source2.value.settlement : null) !== canonical(item.record.settlement)) throw new Error("Settlement asal refund tidak sesuai");
    edge(source2.operationId, item.operationId);
  }
  validateCashCountTransitions(receipts, byKey, edge);
  const indegree = new Map(changes2.map((change) => [change.operationId, 0]));
  for (const next of edges.values()) for (const id8 of next) indegree.set(id8, (indegree.get(id8) ?? 0) + 1);
  const ready = [...indegree].filter(([, count]) => count === 0).map(([id8]) => id8);
  let visited = 0;
  while (ready.length) {
    const id8 = ready.pop();
    visited++;
    for (const next of edges.get(id8) ?? []) {
      const count = indegree.get(next) - 1;
      indegree.set(next, count);
      if (count === 0) ready.push(next);
    }
  }
  if (visited !== indegree.size) throw new Error("Urutan histori tidak sah");
}

// src/storage/commit.ts
function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const obj2 = value;
    return `{${Object.keys(obj2).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj2[k])}`).join(",")}}`;
  }
  throw new Error("Data operasi tidak sah");
}
function copyInput(value) {
  if (Array.isArray(value)) return value.map(copyInput);
  if (value !== null && typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Data operasi tidak sah");
    return Object.fromEntries(Object.keys(value).map((key2) => [key2, copyInput(value[key2])]));
  }
  return value;
}

// src/storage/validate-checkpoint.ts
function fail(path, reason5) {
  throw new Error(`Checkpoint ${path}: ${reason5}`);
}
function object4(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(path, "harus berupa objek");
  return value;
}
function id7(value, path) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) fail(path, "ID wajib berupa teks tidak kosong (maksimal 200 karakter)");
  return value;
}
function integer3(value, min, path) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) fail(path, `harus integer aman minimal ${min}`);
  return value;
}
function data(value, path) {
  try {
    return canonical(value);
  } catch {
    return fail(path, "nilai bukan data operasi yang didukung");
  }
}
function array(value, path) {
  if (!Array.isArray(value)) fail(path, "koleksi wajib berupa array");
  return value;
}
function uniqueRows(rows, key2, path) {
  const seen = /* @__PURE__ */ new Set();
  return rows.map((value, i) => {
    const row2 = object4(value, `${path}[${i}]`);
    const k = path === "state" && typeof row2[key2] === "string" && row2[key2].startsWith("payment-methods:") && row2[key2].length <= 216 && !!row2.value && typeof row2.value === "object" && "recordType" in row2.value && row2.value.recordType === "payment-methods" ? row2[key2] : path === "state" && typeof row2[key2] === "string" && row2[key2].startsWith("sku-stock-mapping:") && row2[key2].length <= 2500 && !!row2.value && typeof row2.value === "object" && "recordType" in row2.value && row2.value.recordType === "sku-stock-mapping" ? row2[key2] : path === "sequences" && typeof row2[key2] === "string" && row2[key2] ? row2[key2] : id7(row2[key2], `${path}[${i}].${key2}`);
    if (seen.has(k)) fail(path, `kunci duplikat: ${k}`);
    seen.add(k);
    return row2;
  });
}
function event(value, path, operationId) {
  const row2 = object4(value, path);
  id7(row2.id, `${path}.id`);
  const op = id7(row2.operationId, `${path}.operationId`);
  if (operationId !== void 0 && op !== operationId) fail(path, "operationId berbeda dari receipt");
  data(row2, path);
  return row2;
}
function business(value, path) {
  try {
    validateBusinessRecord(value);
  } catch {
    fail(path, "record bisnis tidak sah");
  }
}
function validateCheckpoint(input) {
  const root = object4(input, "root");
  if (root.schema !== 1) fail("schema", "versi tidak didukung");
  const state = uniqueRows(array(root.state, "state"), "key", "state");
  const ledger = uniqueRows(array(root.ledger, "ledger"), "id", "ledger");
  const audit = uniqueRows(array(root.audit, "audit"), "id", "audit");
  const outbox = uniqueRows(array(root.outbox, "outbox"), "id", "outbox");
  const receipts = uniqueRows(array(root.receipts, "receipts"), "id", "receipts");
  const sequences = uniqueRows(array(root.sequences, "sequences"), "key", "sequences");
  for (const row2 of state) {
    integer3(row2.revision, 0, `state ${row2.key}.revision`);
    data(row2.value, `state ${row2.key}.value`);
    business(row2.value, `state ${row2.key}.value`);
  }
  const receiptIds = new Set(receipts.map((r) => r.id));
  for (const [name, rows] of [["ledger", ledger], ["audit", audit], ["outbox", outbox]]) for (const row2 of rows) {
    event(row2, `${name} ${row2.id}`);
    if (!receiptIds.has(row2.operationId)) fail(name, `receipt tidak ditemukan untuk ${row2.operationId}`);
  }
  const expectedEvents = { ledger: /* @__PURE__ */ new Map(), audit: /* @__PURE__ */ new Map(), outbox: /* @__PURE__ */ new Map() };
  const history2 = /* @__PURE__ */ new Map();
  const seqs = /* @__PURE__ */ new Map();
  for (const receipt of receipts) {
    const path = `receipts ${receipt.id}`;
    if (typeof receipt.payload !== "string") fail(`${path}.payload`, "harus berupa JSON operasi");
    let parsed;
    try {
      parsed = JSON.parse(receipt.payload);
    } catch {
      fail(`${path}.payload`, "JSON operasi rusak");
    }
    const change = object4(parsed, `${path}.payload`);
    if (data(change, `${path}.payload`) !== receipt.payload) fail(`${path}.payload`, "format operasi tidak kanonis");
    if (change.operationId !== receipt.id) fail(path, "operationId berbeda dari ID receipt");
    for (const field of ["operationId", "storeId", "deviceId", "kind", "targetId", "actorId"]) id7(change[field], `${path}.${field}`);
    for (const field of ["deviceEpoch", "localSequence", "policyVersion"]) integer3(change[field], 1, `${path}.${field}`);
    if (data(change.result, `${path}.result`) !== data(receipt.result, `${path}.result`)) fail(path, "hasil berbeda dari operasi");
    const states = array(change.state, `${path}.state`);
    if (!states.length) fail(path, "state operasi kosong");
    const keys = /* @__PURE__ */ new Set();
    for (const item of states) {
      const row2 = object4(item, `${path}.state`);
      const key2 = typeof row2.key === "string" && row2.key.startsWith("payment-methods:") && row2.key.length <= 216 && !!row2.value && typeof row2.value === "object" && "recordType" in row2.value && row2.value.recordType === "payment-methods" ? row2.key : typeof row2.key === "string" && row2.key.startsWith("sku-stock-mapping:") && row2.key.length <= 2500 && !!row2.value && typeof row2.value === "object" && "recordType" in row2.value && row2.value.recordType === "sku-stock-mapping" ? row2.key : id7(row2.key, `${path}.state.key`);
      if (keys.has(key2)) fail(path, "state operasi duplikat");
      keys.add(key2);
      const rev2 = row2.expectedRevision === null ? 0 : integer3(row2.expectedRevision, 0, `${path}.expectedRevision`) + 1;
      if (!Number.isSafeInteger(rev2)) fail(path, "revisi melampaui batas");
      business(row2.value, `${path}.state.value`);
      const value = data(row2.value, `${path}.state.value`);
      const versions = history2.get(key2) ?? /* @__PURE__ */ new Map();
      if (versions.has(rev2)) fail(path, "revisi state duplikat");
      versions.set(rev2, value);
      history2.set(key2, versions);
    }
    for (const name of ["ledger", "audit", "outbox"]) {
      const rows = name === "outbox" ? [change.outbox] : array(change[name], `${path}.${name}`);
      if (name === "audit" && !rows.length) fail(path, "audit operasi kosong");
      for (const item of rows) {
        const row2 = event(item, `${path}.${name}`, receipt.id);
        const key2 = row2.id;
        if (expectedEvents[name].has(key2)) fail(path, `event ${name} duplikat`);
        expectedEvents[name].set(key2, data(row2, path));
      }
    }
    const seqKey = JSON.stringify([change.storeId, change.deviceId, change.deviceEpoch]);
    const n = change.localSequence;
    const numbers = seqs.get(seqKey) ?? /* @__PURE__ */ new Set();
    if (numbers.has(n)) fail(path, "urutan operasi duplikat");
    numbers.add(n);
    seqs.set(seqKey, numbers);
  }
  for (const [name, rows] of [["ledger", ledger], ["audit", audit], ["outbox", outbox]]) {
    const expected = expectedEvents[name];
    if (rows.length !== expected.size) fail(name, "jumlah event tidak sesuai receipt");
    for (const row2 of rows) if (expected.get(row2.id) !== data(row2, name)) fail(name, `event ${row2.id} tidak sesuai receipt`);
  }
  if (state.length !== history2.size) fail("state", "jumlah state tidak sesuai receipt");
  for (const row2 of state) {
    const versions = history2.get(row2.key);
    const rev2 = row2.revision;
    if (!versions || versions.size !== rev2 + 1 || [...versions.keys()].some((v) => v > rev2) || versions.get(rev2) !== data(row2.value, "state.value")) fail("state", `riwayat revisi ${row2.key} tidak sesuai receipt`);
  }
  if (sequences.length !== seqs.size) fail("sequences", "jumlah sequence tidak sesuai receipt");
  for (const row2 of sequences) {
    const n = integer3(row2.sequence, 1, `sequences ${row2.key}.sequence`);
    const numbers = seqs.get(row2.key);
    if (!numbers || numbers.size !== n || [...numbers].some((v) => v > n) || !numbers.has(n)) fail("sequences", `urutan ${row2.key} tidak sesuai receipt`);
  }
  try {
    validateTransitions(input.receipts, input.state);
  } catch {
    fail("histori", "transisi record bisnis tidak sah");
  }
  return input;
}
export {
  validateCheckpoint
};
