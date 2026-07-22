# Kablo Hesap Motoru — Tasarım Spesifikasyonu

**Tarih:** 2026-07-22
**Durum:** Onaylandı, implementasyon planı bekliyor
**Kapsam:** `packages/calculation-core/src/cable-sizing/` — yeni modül; standart IEC 60364 / TS HD 60364

---

## 1. Amaç ve arka plan

Mevcut kablo hesabı ([`cable/algorithm.ts`](../../../packages/calculation-core/src/cable/algorithm.ts)) yalnız 2 kriter uyguluyor: termal (kT·kG·kH) + gerilim düşümü. apokris.com seviyesinde. Referans olarak incelenen jCalc (AS/NZS 3008) ve ELEK Cable Pro (BS 7671) 7 kriterli tam zincir uyguluyor: termal + koruma koordinasyonu + ΔU + kısa devre + çevrim empedansı + PE + nötr.

Ayrıca mevcut motor **tek fazı desteklemiyor** (`throw`), **PVC tablosu yok** (sadece XLPE), reaktansı **sabit 0.08 Ω/km** alıyor.

Bu spec, tam zincirli yeni bir motor kurar ve kullanımı 3 moda ayırır: her kullanıcıya 8 kriter dayatmamak için.

## 2. Üç mod

Kullanım profiline göre üç ayrı çıkış noktası. **Tek kriter zinciri**, mod hangi kriterlerin aktif olduğunu seçer — üç ayrı motor değil (formül tekrarı yasak: master plan §9).

| Mod | Ne için | Motor |
|---|---|---|
| **Cetvel** | Hızlı tek-tablo lookup | Mevcut [`cable/ruler.ts`](../../../packages/calculation-core/src/cable/ruler.ts) — **değişmez** |
| **Hesap** | Günlük kullanım, apokris seviyesi | Yeni motor, sınırlı kriter seti |
| **Detaylı** | Niş, tam sertifikasyon zinciri | Yeni motor, tam kriter seti |

### Kriter × mod matrisi

| # | Kriter | Hesap | Detaylı |
|---|---|---|---|
| 1 | Minimum mekanik kesit | ✅ eleme | ✅ eleme |
| 2 | Termal (kT·kG·kH) | ✅ eleme | ✅ eleme |
| 2+ | kS toprak direnci, kD derinlik | ❌ | ✅ (metot D1/D2) |
| 3 | Cihaz koordinasyonu (Ib≤In≤Iz, I2≤1.45Iz) | ⚠️ öneri | ✅ eleme |
| 4 | Gerilim düşümü | ✅ eleme | ✅ eleme |
| 5 | PE kesiti | ⚠️ Tablo 54.2 bilgi | ✅ adyabatik + 54.2 |
| 6 | Kısa devre (I²t ≤ k²S²) | ❌ | ✅ eleme |
| 7 | Zs / otomatik kesme | ❌ | ✅ eleme |
| 8 | Nötr kesiti | ⚠️ basit kural | ✅ harmonik dahil |
| — | Paralel iletken | ❌ | ✅ |

⚠️ = hesaplanır ve gösterilir, **eleme yapmaz**. Hesap modunda cihaz koordinasyonu öneridir (apokris davranışı): uyan kesici yoksa uyarı çıkar, kesit yine seçilir.

## 3. Mimari

### Dizin yapısı

```
packages/calculation-core/src/cable-sizing/
  index.ts                    # tek public giriş: selectCable(input) → CableSelectionResult
  types.ts                    # Input/Output/CandidateEvaluation DTO
  validate.ts                 # girdi doğrulama
  design-current.ts           # Adım 0: kW/kVA/A/hp → Ib
  sizing-current.ts           # Adım 1: harmonik → I_B'
  correction.ts               # Adım 2: kT·kG·kS·kD·kH → kTotal
  select.ts                   # ascending scan, evaluateCandidate çağırır
  evaluate-candidate.ts       # moda göre kriter setini çözer, sırayla uygular
  criteria/
    mechanical-min.ts         # 1
    thermal.ts                # 2
    device-coordination.ts    # 3
    voltage-drop.ts           # 4 (voltage-drop/ modülünü çağırır, kopyalamaz)
    pe-conductor.ts           # 5
    short-circuit.ts          # 6
    loop-impedance.ts         # 7
    neutral-conductor.ts      # 8
```

### İlkeler

- Her `criteria/*.ts` **saf fonksiyon**: `(ctx: CandidateContext) → CriterionOutcome`. Katalog/tablo okumaz — veri `ctx` içinde hazır gelir. Test = düz sayı in/out.
- Veri erişimi yalnız `calculation-data` accessor'ları üzerinden (`decisions.md:63`).
- ΔU formülü **yeniden yazılmaz**: mevcut [`voltage-drop/index.ts`](../../../packages/calculation-core/src/voltage-drop/index.ts) çağrılır.
- Çıktı sözleşmesi mevcut `CalculationResult<T>` (`[LOCKED] §2.5`): `value/warnings/assumptions/formulaVariant/dataVersion/engineVersion`.
- Eski `cable/` ve `protection/` dokunulmaz; `device-coordination.ts` katalog accessor'ını doğrudan okur.

### Kriter zinciri — sıra zorunlu

Kriterler bağımsız değil, zincir:
- Adım 3'ten `In` çıkmadan adım 6'nın `t`'si ve adım 7'nin `Ia`'sı belirlenemez.
- Adım 5'ten `S_PE` çıkmadan adım 7'nin `Zs`'i hesaplanamaz.

`evaluate-candidate.ts` bu sırayı sabitler; aktif kriterlerde ilk `fail`'de durur, `failedAt` yazar. Pasif kriter `{status:"not-applicable"}` döner.

### Ascending scan

`select.ts` en küçük kesitten başlar, her aday için `evaluateCandidate` çağırır, tüm aktif kriterleri geçen ilk kesiti seçer. `candidateTrace` her adayın hangi kriterden elendiğini taşır → UI "2.5 mm² neden olmadı" sorusunu cevaplar.

## 4. Formüller

Motorda kodlanacak, veri gerektirmeyen kısım:

```
Ib (1F)   = P·1000 / (U₀·cosφ·η)
Ib (3F)   = P·1000 / (√3·U·cosφ·η)
Ib (kVA)  = S·1000 / (√3·U)
I_B'      = h3 ≤ 33 ? Ib : 3·Ib·(h3/100)
kTotal    = kT · kG · kS · kD · kH · kExtra
Iz_req    = I_B' / kTotal
Iz'       = Iz_tablo · kTotal

R_θ       = R₂₀ · (1 + α₂₀·(θ − 20))          θ = θ_max (PVC 70 / XLPE 90) — "maksimum" modu
ΔU        = b · Ib · (L/1000) · (R_θ·cosφ + X·sinφ)   b: 2 (1F/DC) | √3 (3F L-L) | 1 (3F L-N)
ΔU%       = 100 · ΔU / U₀
sinφ      = √(max(0, 1 − cos²φ))

In        = min{ In ∈ katalog : In ≥ Ib }
I2        = In · i2Multiplier                 MCB 1.45, gG sigorta 1.6
koordinasyon: Ib ≤ In ≤ Iz'  ∧  I2 ≤ 1.45·Iz'

S_min_sc  = √(I²t) / k                        I²t: katalog letThrough veya Isc²·t
kısa devre: I²t ≤ k²·S²

S_PE      = max( √(I_f²·t)/k_PE , Tablo 54.2 )
Ia        = designMultiplier · In             B→5, C→10, D→20 (üst sınır, açma garantisi)
Z_faz     = √(R_θ² + X²)                       Ω/km
Zs        = Z_kaynak + (Z_faz + Z_PE)·L/1000
kesme:      Zs · Ia ≤ U₀

Z_kaynak: "estimated"  → 0.2·U₀/Ia            (kaynakta %80 gerilim varsayımı)
          "calculated" → U₀ / I_f
          "measured"   → kullanıcı girdisi

paralel n: R/n, X/n, Iz·n
```

**Karar defaultları:**
- İletken sıcaklığı θ = **maksimum** (muhafazakâr): PVC 70 / XLPE 90.
- Ia = **üst sınır** çarpanı (B5/C10/D20): açmayı garanti eder.
- Zs kaynak empedansı: üç yöntem, kullanıcı seçer.
- Kısa devre: katalog `letThroughI2t` varsa oradan; yoksa kullanıcı Isc+t → `I²t = Isc²·t`; ikisi de yoksa kriter `skipped` + uyarı.

**Sabitler** ([`constants/index.ts`](../../../packages/calculation-core/src/common/constants/index.ts), zaten var, `decisions.md` frozen): ρ_Cu20=0.01724, ρ_Al20=0.02826, α_Cu20=0.00393, α_Al20=0.00403.

## 5. Montaj metodu seti — D1/D2 genişletmesi

Frozen set `{A1,A2,B1,B2,C,D,E}` idi. Gerçek IEC verisi tek `D`'yi ikiye ayırıyor:
- **D1** = toprakta boru/kanal içinde
- **D2** = doğrudan gömülü

Detaylı motor kS/kD düzeltmelerini (`buriedInDucts` vs `buriedDirect`) bu ayrıma dayandırıyor. Yeni motorun metot seti:

```
{A1, A2, B1, B2, C, D1, D2}
```

**E ertelendi:** VERILER.md'de E sütunu (B.52.10–13) neredeyse boş. B.52.10–13 tam verisi gelince eklenir. Eski `cable/` ve cetvel kendi tek-`D`/E setiyle kalır (frozen bozulmaz).

## 6. Veri güven katmanı (fail-safe)

VERILER.md'nin kendi kuralı: doğrulanmamış hücre motora girerse, iki kaynakla teyit edilene kadar motor o kombinasyon için hesabı **reddetmeli**, asla tahmini değere düşmemeli.

Her dataset entry'si (veya dataset metadata'sı) `confidence` taşır:

```
confidence: "verified" | "draft" | "missing"
```

- `verified` — birincil/üretici kaynakla doğrulanmış. Sessiz kullanılır.
- `draft` — ikincil transkripsiyon (ör. ampacity B.52.2–5). Kullanılırsa sonuca `warning` (`code: "unverified-data"`).
- `missing` — hücre yok. İlgili kriter `skipped` döner + `warning` (`code: "data-not-available"`); eleme yapan kritere gerekliyse hesap o kombinasyon için **hata** döndürür (`RangeError`), default'a düşmez.

Ampacity tabloları `draft` olarak girer; kullanıcı üretici kataloğuyla doğruladıkça `verified`e çekilir — kod değişmez, yalnız veri.

## 7. Girdi yüzeyi

**Hesap modu** — mevcut `CableSizingInput`'a yakın:
`Ib veya (P,U,cosφ,faz)` · malzeme · yalıtım (PVC/XLPE) · montaj metodu · ortam °C · grup devre · uzunluk · ΔU limiti · h3%

**Detaylı mod** — üstüne:
toprak termal direnci · gömme derinliği · dizilim · paralel iletken sayısı · (Isc,t) veya cihaz modeli · Zs yöntemi + kaynak verisi · sistem topolojisi (TN/TT) · hedef kesme süresi (final 0.4 / dağıtım 5 s) · PE tipi (kablo içi / ayrı)

## 8. DTO taslağı

```ts
type CableSizingMode = "standard" | "detailed";
type CriterionId =
  | "mechanical" | "thermal" | "device" | "voltageDrop"
  | "pe" | "shortCircuit" | "loopImpedance" | "neutral";
type CriterionStatus = "pass" | "fail" | "not-applicable" | "skipped";

interface CriterionOutcome {
  id: CriterionId;
  status: CriterionStatus;
  detail: Record<string, number | string | null>;  // kritere özgü çıktı
}

interface CandidateEvaluation {
  sectionMm2: number;
  criteria: CriterionOutcome[];
  failedAt: CriterionId | null;
  accepted: boolean;
}

interface CableSelectionOutput {
  mode: CableSizingMode;
  selectedSectionMm2: number;
  designCurrentA: number;
  sizingCurrentA: number;
  kT: number; kG: number; kS: number; kD: number; kH: number; kTotal: number;
  izRequiredA: number;
  selectedDevice: { nominalCurrentA: number; curve: string; family: string } | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
  candidateTrace: CandidateEvaluation[];
  // + her aktif kriterin final değerleri (ΔU%, Zs, energyRatio, ...)
}

type CableSelectionResult = CalculationResult<CableSelectionOutput>;
```

## 9. Kriter modül imzaları

```
mechanical-min:  (S, material, circuitKind) → { pass, minRequiredMm2 }
thermal:         (S, IzTable, kTotal, sizingCurrentA) → { pass, izCorrectedA }
device-coord:    (Ib, izCorrectedA, catalog, deviceType, mode) → { pass, selectedIn, i2 }
voltage-drop:    (S, vdInput, limitPercent) → { pass, deltaVPercent, deltaVVolts }
pe-conductor:    (S, faultCurrentA, t, kPE) → { sPeMm2, byAdiabatic, byTable }
short-circuit:   (S, k, letThroughI2t | {iscA,t}) → { pass, sMinMm2, energyRatio }
loop-impedance:  (S, sPe, L, zSource, In, curve, u0, maxDisconnectS) → { pass, zsOhm, lMaxM }
neutral:         (S, phase, h3Percent, material) → { sNeutralMm2, basis }
```

## 10. Veri durumu — implementasyon önkoşulu

Motor bu sayılara doğrudan güvenir. Kaynak: [`Plan/VERILER.md`](../../../Plan/VERILER.md) (derleme), [`Plan/VERI_TALEBI_kablo-motoru.md`](../../../Plan/VERI_TALEBI_kablo-motoru.md) (şemalar).

### Hesap modunu açan (öncelik 1)

| Veri | Durum | İş |
|---|---|---|
| Ampacity B.52.2–5 (D1/D2, 1.5–300) | ⚠️ `draft` | JSON'a çevir, loader'a D1/D2 ekle, `draft` etiketle |
| kT hava B.52.14 (10–80°C) | ✅ | satır tamamla |
| kT toprak B.52.15 | ⚠️ `draft` | matris doğrulanmalı |
| kG demet B.52.17 | ✅ | şemayı arrangement-boyutlu yap |
| Min mekanik kesit 52.2 | ✅ | yeni dataset |
| R (IEC 60228) | ✅ | conductor-impedance dataset |
| X çok-damarlı/trefoil/flat | ✅ | aynı dataset |

### Detaylı modu açan (öncelik 2)

| Veri | Durum | İş |
|---|---|---|
| Adyabatik k (line+pe) | ✅ | yeni dataset |
| PE tablo 54.2 | ✅ | yeni dataset |
| Kesme süreleri 41.1 | ✅ | yeni dataset |
| Kesici Ia B/C/D | ✅ | yeni dataset |
| kS toprak (kanal) B.52.16 | ✅ | yeni dataset |
| Katalog i2Multiplier | ✅ | mevcut kataloğa alan ekle |

### Eksik — gelene kadar kriter `skipped`/`missing`

| Veri | Durum | Etki |
|---|---|---|
| kD gömme derinliği | ❌ IEC sayısal yayımlamıyor | Detaylı modda kD=1.00 + uyarı; kesin değer IEC 60287 / BS 7671 4B4'ten |
| Flat-spaced reaktans | ❌ | O dizilimde X `missing` → kriter uyarı |
| Katalog let-through I²t | ❌ ABB grafik | Kısa devre kriteri manuel Isc/t yedeğiyle çalışır |
| kS doğrudan-gömülü | ❌ | D2 metodunda kS kanal değeriyle (muhafazakâr) + uyarı |
| E sütunu (B.52.10–13) | ❌ | Metot E ertelendi |
| kG B.52.18/19/21 tam | ⚠️ kısmi | O arrangement'lar `draft`/eksik |

## 11. Test stratejisi

- Her kriter modülü: birim testi, elle-hesap fixture (in/out sayı).
- `select.ts`: monotonluk (S↑ ile Ib, L, ΔU davranışı), IEC Ek örnek hesapları.
- Veri güven katmanı: `draft` hücre → warning; `missing` + eleme kriteri → throw.
- Regresyon: mevcut `cable/` ve `voltage-drop/` testleri bozulmamalı.
- Property test: `ΔV_LN = ΔV_LL/√3` (mevcut invariant korunur).

## 12. Kapsam dışı (YAGNI)

- BS 7671 / NEC standartları (v1 IEC-only, `decisions.md:48`).
- Kanal (conduit) çapı hesabı.
- E/F/G metotları (veri gelince ayrı iş).
- Cihaz eğrisinden otomatik `t` çıkarımı (v1'de kullanıcı girer veya katalog sabit).
- Eski `cable/` sizing modülünün silinmesi (UI geçişi tamamlanınca ayrı iş).
```
