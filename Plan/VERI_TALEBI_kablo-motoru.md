# Kablo Hesap Motoru — Veri Talebi

> Yeni `cable-sizing/` modülü için gereken tüm tablolar. Her başlık bir `calculation-data` dataset'ine karşılık gelir.
> **Doldurma kuralı:** değerleri standardın kendisinden oku. Türetme/tahmin yapma — motor bu sayılara doğrudan güvenecek.
> Her dosya `DatasetMetadata { id, standard, revision, source, validFrom, notes }` taşımak zorunda (`decisions.md:62`).

Durum işaretleri: ✅ repoda var · 🔶 var ama eksik · ❌ yok

---

## 1. Ampacity tabloları — 🔶 (8 dosyadan 2'si var)

**Mevcut:** `copper-xlpe-90c-3loaded.json`, `aluminum-xlpe-90c-3loaded.json` (1.5–120 mm², A1–E)

**Gereken 6 yeni dosya** — `packages/calculation-data/src/iec/ampacity/` altına:

| Dosya | Yalıtım | Yüklü iletken | Kaynak tablolar |
|---|---|---|---|
| `copper-pvc-70c-2loaded.json` | PVC 70°C | 2 (tek faz) | B.52.2 (A1,A2,B1,B2,C) + B.52.4 (E) + B.52.10/12 (D) |
| `copper-pvc-70c-3loaded.json` | PVC 70°C | 3 (trifaze) | aynı |
| `copper-xlpe-90c-2loaded.json` | XLPE/EPR 90°C | 2 (tek faz) | B.52.3 + B.52.5 + B.52.10/12 |
| `aluminum-pvc-70c-2loaded.json` | PVC 70°C | 2 | aynı |
| `aluminum-pvc-70c-3loaded.json` | PVC 70°C | 3 | aynı |
| `aluminum-xlpe-90c-2loaded.json` | XLPE/EPR 90°C | 2 | aynı |

**Şema** (mevcut dosyalarla birebir aynı — loader değişmesin):

```json
{
  "metadata": {
    "id": "iec-60364-5-52-ampacity-copper-pvc-70c-2loaded-v1",
    "standard": "IEC 60364-5-52",
    "revision": "v1",
    "source": "Tablo B.52.2 + B.52.4 + B.52.10/B.52.12",
    "validFrom": "YYYY-MM-DD",
    "notes": "PVC yalıtım (70°C), 2 yüklü iletken, tek faz. Referans: havada 30°C, toprakta 20°C."
  },
  "material": "copper",
  "conductorCount": 2,
  "system": "single-phase",
  "insulation": "PVC",
  "insulationTemperatureC": 70,
  "referenceAmbientAirC": 30,
  "referenceGroundC": 20,
  "entries": [
    { "crossSectionMm2": 1.5, "methods": { "A1": _, "A2": _, "B1": _, "B2": _, "C": _, "D": _, "E": _ } }
  ]
}
```

**Notlar:**
- Tabloda olmayan hücre → `null` (uydurma yok). Örn. Al 1.5–6 mm² yok.
- `conductorCount` 2 veya 3; `system` `"single-phase"` veya `"three-phase"`.
- Kesit dizisi artan sırada olmalı, loader kontrol ediyor.

**Kesit aralığı — karar gerekli:** mevcut dosyalar 120 mm²'de bitiyor.
- [ ] 120'de kalsın
- [X] 150, 185, 240, 300 eklensin  ← **öneri**, büyük tesisatlar için
- [ ] 400, 500, 630'a kadar

Uzatma seçilirse mevcut 2 XLPE-3loaded dosyasına da aynı satırlar eklenmeli.

---

## 2. Sıcaklık düzeltme faktörleri kT — 🔶 (satır eksik)

**Mevcut:** `temperature-factors/data.json` — hava 4 satır (20/30/40/50), toprak 10 satır (10–55)

**Gereken:** tam aralık, 5°C adımlarla.

| Tablo | Aralık | Şu an |
|---|---|---|
| B.52.14 — havada | 10 → 80 °C | sadece 20,30,40,50 |
| B.52.15 — toprak altı | 10 → 80 °C | 10–55 |

**Şema** (mevcut yapı korunur):
```json
{
  "metadata": { "...": "..." },
  "air":        [ { "temperatureC": 10, "pvc70": _, "xlpeEpr90": _ } ],
  "underground":[ { "temperatureC": 10, "pvc70": _, "xlpeEpr90": _ } ]
}
```

> Uygulama kuralı sabit: metot D → `underground`, diğer tüm metotlar → `air`.

---

## 3. Gruplama faktörleri kG — 🔶 (tek düzenleme, 5 satır)

**Mevcut:** `grouping-factors/data.json` — 1,2,3,4,6 devre; tek düzenleme (delikli tava varsayımı)

**Sorun:** IEC'de kG **düzenlemeye (arrangement) göre farklı**. Tek tablo yetmez, boyut eklenmeli.

**Gereken — yeni şema:**
```json
{
  "metadata": { "...": "..." },
  "arrangements": [
    {
      "id": "bunched-in-air-or-surface",
      "label": "Demet halinde, havada / yüzeyde / gömülü / kapalı",
      "sourceTable": "B.52.17",
      "appliesToMethods": ["A1","A2","B1","B2","C"],
      "entries": [ { "circuits": 1, "factor": 1.00 } ]
    },
    { "id": "single-layer-on-wall-or-floor",     "sourceTable": "B.52.17", "entries": [] },
    { "id": "single-layer-on-ceiling",            "sourceTable": "B.52.17", "entries": [] },
    { "id": "single-layer-perforated-tray-horizontal", "sourceTable": "B.52.20", "entries": [] },
    { "id": "single-layer-perforated-tray-vertical",   "sourceTable": "B.52.20", "entries": [] },
    { "id": "single-layer-ladder-or-cleats",      "sourceTable": "B.52.21", "entries": [] },
    { "id": "buried-direct-multicore",            "sourceTable": "B.52.18", "entries": [] },
    { "id": "buried-in-ducts-multicore",          "sourceTable": "B.52.19", "entries": [] }
  ]
}
```

**Devre sayısı satırları:** 1,2,3,4,5,6,7,8,9,12,16,20 (IEC tablosunda hangi sütunlar varsa)

**Gömülü düzenlemelerde ek boyut:** kablolar arası mesafe (bitişik / 0.125 m / 0.25 m / 0.5 m). Varsa `entries` içinde:
```json
{ "circuits": 2, "spacing": "touching", "factor": _ }
```

> `sourceTable` numaralarını doldururken standarttan teyit et — motor bu alanı `dataVersion`'a yazacak.

---

## 4. Toprak termal direnci kS — ❌ yok

**Kaynak:** IEC 60364-5-52 — toprak termal direnci düzeltme tablosu (referans 2.5 K·m/W)

**Yeni dosya:** `packages/calculation-data/src/iec/soil-resistivity-factors/data.json`
```json
{
  "metadata": { "source": "Tablo B.52.16", "...": "..." },
  "referenceResistivityKmPerW": 2.5,
  "entries": [
    { "thermalResistivityKmPerW": 0.5, "buriedDirect": _, "buriedInDucts": _ },
    { "thermalResistivityKmPerW": 0.7, "buriedDirect": _, "buriedInDucts": _ },
    { "thermalResistivityKmPerW": 1.0, "buriedDirect": _, "buriedInDucts": _ },
    { "thermalResistivityKmPerW": 1.5, "buriedDirect": _, "buriedInDucts": _ },
    { "thermalResistivityKmPerW": 2.0, "buriedDirect": _, "buriedInDucts": _ },
    { "thermalResistivityKmPerW": 2.5, "buriedDirect": 1.00, "buriedInDucts": 1.00 },
    { "thermalResistivityKmPerW": 3.0, "buriedDirect": _, "buriedInDucts": _ }
  ]
}
```
> Sadece metot D'de uygulanır. Diğer metotlarda kS = 1.

---

## 5. Gömme derinliği kD — ❌ yok

**Kaynak:** IEC 60364-5-52 Ek B derinlik düzeltme tablosu (referans derinlik 0.70 m)

**Yeni dosya:** `packages/calculation-data/src/iec/burial-depth-factors/data.json`
```json
{
  "metadata": { "source": "<tablo no>", "...": "..." },
  "referenceDepthM": 0.70,
  "entries": [
    { "depthM": 0.50, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 0.70, "buriedDirect": 1.00, "buriedInDucts": 1.00 },
    { "depthM": 1.00, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 1.25, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 1.50, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 2.00, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 2.50, "buriedDirect": _, "buriedInDucts": _ },
    { "depthM": 3.00, "buriedDirect": _, "buriedInDucts": _ }
  ]
}
```
> Kesite göre de değişiyorsa (bazı baskılarda ≤185 mm² / >185 mm² ayrımı var) satırlara `sectionRange` alanı ekle.

---

## 6. İletken direnç + reaktans (R, X) — ❌ yok, en kritik eksik

**Şu an ne yapıyoruz:** `R₂₀ = ρ·1000/S` hesaplanıyor (`voltage-drop/resistance.ts`), `X` sabit **0.08 Ω/km** (`constants/index.ts:7`).
**Sorun:** örgülü iletkende gerçek direnç ~%2 yüksek; X kesite ve dizilime göre 0.07–0.20 Ω/km arasında değişiyor. Büyük kesitte ΔU hatası ciddi.

**Kaynak:** IEC 60364-5-52 Ek G, Tablo G.52.1 (kablo direnç/reaktans değerleri) — yoksa IEC 60228 (R) + IEC 60287-1-1 (X)

**Yeni dosya:** `packages/calculation-data/src/iec/conductor-impedance/data.json`
```json
{
  "metadata": { "source": "Tablo G.52.1 / IEC 60228", "...": "..." },
  "referenceTemperatureC": 20,
  "entries": [
    {
      "crossSectionMm2": 1.5,
      "resistance20OhmPerKm": { "copper": _, "aluminum": _ },
      "reactanceOhmPerKm": {
        "multicore": _,
        "singleCoreTrefoil": _,
        "singleCoreFlatTouching": _,
        "singleCoreFlatSpaced": _
      }
    }
  ]
}
```

**Doldurulacak kesitler:** ampacity dosyalarındaki tüm kesitler (1.5 → seçilen üst sınır)

**Notlar:**
- Alüminyumun olmadığı kesitlerde (1.5–6) `null`.
- Reaktans tablosu sadece bazı dizilimleri veriyorsa eksikleri `null` bırak, motor `assumption` basar.
- Direnç 20°C'de verilir; motor `R_θ = R₂₀·(1 + α₂₀·(θ−20))` ile yalıtımın max sıcaklığına çıkarır (kararın: "maksimum" modu).

---

## 7. Adyabatik k sabitleri — ❌ dataset olarak yok

**Kaynak:** IEC 60364-5-54 (Tablo 54.2–54.6) / IEC 60364-4-43 Tablo 43A

Değerleri biliyorum ama `decisions.md:63` "Core modules must never hardcode ruleset tables" diyor → dataset olmalı.

**Yeni dosya:** `packages/calculation-data/src/iec/adiabatic-k/data.json`
```json
{
  "metadata": { "source": "IEC 60364-5-54 Tablo 54.2–54.6", "...": "..." },
  "entries": [
    { "material": "copper",   "insulation": "PVC",      "initialTempC": 70, "finalTempC": 160, "k": 115, "role": "line" },
    { "material": "copper",   "insulation": "XLPE/EPR", "initialTempC": 90, "finalTempC": 250, "k": 143, "role": "line" },
    { "material": "aluminum", "insulation": "PVC",      "initialTempC": 70, "finalTempC": 160, "k": 76,  "role": "line" },
    { "material": "aluminum", "insulation": "XLPE/EPR", "initialTempC": 90, "finalTempC": 250, "k": 94,  "role": "line" },

    { "material": "copper",   "insulation": "PVC",      "initialTempC": 30, "finalTempC": 160, "k": _, "role": "pe-bunched" },
    { "material": "copper",   "insulation": "XLPE/EPR", "initialTempC": 30, "finalTempC": 250, "k": _, "role": "pe-bunched" },
    { "material": "aluminum", "insulation": "PVC",      "initialTempC": 30, "finalTempC": 160, "k": _, "role": "pe-bunched" },
    { "material": "aluminum", "insulation": "XLPE/EPR", "initialTempC": 30, "finalTempC": 250, "k": _, "role": "pe-bunched" }
  ]
}
```
> `role: "line"` değerlerini ben doldurdum — **teyit et**. `role: "pe-bunched"` (ayrı PE iletkeni, başlangıç 30°C) satırlarını Tablo 54.3'ten doldur; PE kablo içindeyse `"line"` satırları kullanılır.

---

## 8. Minimum mekanik kesit — ❌ dataset olarak yok

**Kaynak:** IEC 60364-5-52 Tablo 52.3

**Yeni dosya:** `packages/calculation-data/src/iec/minimum-section/data.json`
```json
{
  "metadata": { "source": "Tablo 52.3", "...": "..." },
  "entries": [
    { "circuitKind": "power",   "material": "copper",   "minSectionMm2": 1.5 },
    { "circuitKind": "power",   "material": "aluminum", "minSectionMm2": 16 },
    { "circuitKind": "signal",  "material": "copper",   "minSectionMm2": 0.5 }
  ]
}
```
> Değerleri ben yazdım — teyit et, Al için bazı baskılarda 10 mm² geçiyor.

---

## 9. PE iletken tablosu (54.7) — ❌ dataset olarak yok

**Kaynak:** IEC 60364-5-54 Tablo 54.7

**Yeni dosya:** `packages/calculation-data/src/iec/pe-conductor-table/data.json`
```json
{
  "metadata": { "source": "Tablo 54.7", "...": "..." },
  "entries": [
    { "lineSectionMaxMm2": 16,   "rule": "equal",       "peSectionMm2": null },
    { "lineSectionMaxMm2": 35,   "rule": "fixed",       "peSectionMm2": 16 },
    { "lineSectionMaxMm2": null, "rule": "half",        "peSectionMm2": null }
  ]
}
```
> `rule`: `equal` → S_PE = S · `fixed` → S_PE = peSectionMm2 · `half` → S_PE = S/2. Kural bende, teyit yeter.

---

## 10. Kesme süreleri — ❌ dataset olarak yok

**Kaynak:** IEC 60364-4-41 Tablo 41.1

**Yeni dosya:** `packages/calculation-data/src/iec/disconnection-times/data.json`
```json
{
  "metadata": { "source": "IEC 60364-4-41 Tablo 41.1", "...": "..." },
  "entries": [
    { "system": "TN", "u0Min": 120, "u0Max": 230, "circuitKind": "final",        "maxSeconds": 0.4 },
    { "system": "TN", "u0Min": 120, "u0Max": 230, "circuitKind": "distribution", "maxSeconds": 5 },
    { "system": "TT", "u0Min": 120, "u0Max": 230, "circuitKind": "final",        "maxSeconds": 0.2 },
    { "system": "TT", "u0Min": 120, "u0Max": 230, "circuitKind": "distribution", "maxSeconds": 1 }
  ]
}
```
> TN 0.4/5 s'den eminim; TT satırlarını ve diğer U₀ bantlarını (230<U₀≤400, >400) tablodan doldur.

---

## 11. Kesici açma katsayıları (Ia) — ❌ dataset olarak yok

**Kaynak:** IEC 60898-1 (MCB anlık açma bantları)

**Yeni dosya:** `packages/calculation-data/src/iec/breaker-trip-multipliers/data.json`
```json
{
  "metadata": { "source": "IEC 60898-1", "...": "..." },
  "entries": [
    { "curve": "B", "minMultiplier": 3,  "maxMultiplier": 5,  "designMultiplier": 5 },
    { "curve": "C", "minMultiplier": 5,  "maxMultiplier": 10, "designMultiplier": 10 },
    { "curve": "D", "minMultiplier": 10, "maxMultiplier": 20, "designMultiplier": 20 }
  ]
}
```
> `designMultiplier` = Zs kontrolünde kullanılacak değer. **Üst sınır** seçtim (açmayı garanti eder, güvenli taraf). jCalc ortalama kullanıyor (4/7.5/12.5) — daha ekonomik ama garanti değil. Hangisini istersen değiştir.

---

## 12. Koruma cihazı kataloğu — 🔶 (seed katalog, alan eksik)

**Mevcut:** `protection-catalog/data.json` — `id, family, poles, nominalCurrentA, breakingCapacityKa, curve, residualCurrentMa, voltageV`

**Gereken ek alanlar:**
```json
{
  "id": "mcb-3p-c-25a-6ka",
  "family": "MCB",
  "nominalCurrentA": 25,
  "curve": "C",
  "breakingCapacityKa": 6,

  "i2Multiplier": 1.45,

  "letThroughI2t": [
    { "prospectiveFaultKa": 1,  "i2tA2s": _ },
    { "prospectiveFaultKa": 3,  "i2tA2s": _ },
    { "prospectiveFaultKa": 6,  "i2tA2s": _ }
  ],

  "tripTimeCurve": [
    { "currentMultiple": 1.45, "seconds": 3600 },
    { "currentMultiple": 2.55, "seconds": _ },
    { "currentMultiple": 5,    "seconds": _ },
    { "currentMultiple": 10,   "seconds": 0.1 }
  ]
}
```

**Alan anlamları:**
- `i2Multiplier`: MCB 1.45, gG sigorta 1.6 — adım 3'te `I2 ≤ 1.45·Iz'` kontrolü için
- `letThroughI2t`: adım 6 (kısa devre) için. Beklenen arıza akımına göre interpolasyon. **Yoksa** kullanıcı Isc+t girer, motor `I²t = Isc²·t` ile adyabatik hesaplar
- `tripTimeCurve`: adım 6'daki `t` ve adım 7 kontrolü için

**Nominal akım serisi** (IEC 60898 / 60947), eksikse tamamla:
`6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250`

**gG sigorta ailesi** eklenmeli mi? Eklenirse `family: "FUSE-gG"`, `i2Multiplier: 1.6`.

---

## 13. Gerilim düşümü limit profilleri — ✅ var

`profiles/voltage-drop-limits/profiles.json` mevcut. Kontrol et: aydınlatma %3 / güç %5 var mı, ana hat–tali–son devre ayrımı gerekiyor mu.

---

## Özet — doldurma sırası

**Hesap modunu açan (öncelik 1):**
1. Ampacity 6 yeni dosya (PVC + 2-yüklü sütunlar) → tek faz desteği ve PVC buradan geliyor
2. kT satır tamamlama
3. kG düzenleme boyutlu yeni şema
8. Minimum mekanik kesit

**Detaylı modu açan (öncelik 2):**
6. R/X impedans tablosu ← **en çok fark yaratan**
7. Adyabatik k
9. PE tablo 54.7
10. Kesme süreleri
11. Kesici açma katsayıları
12. Katalog `letThroughI2t` + `tripTimeCurve`

**Sonra gelebilir (öncelik 3):**
4. kS toprak termal direnci
5. kD gömme derinliği

> Öncelik 3 gelmeden detaylı mod çalışır; ilgili faktör 1.00 alınır ve sonuca `assumption` + `warning` basılır.

---

## Formül özeti — motorda kodlanacak, veri gerekmeyen kısım

```
Ib (1F)   = P·1000 / (U₀·cosφ·η)
Ib (3F)   = P·1000 / (√3·U·cosφ·η)
Ib (kVA)  = S·1000 / (√3·U)
I_B'      = h3 ≤ 33 ? Ib : 3·Ib·(h3/100)
kTotal    = kT · kG · kS · kD · kH · kExtra
Iz_req    = I_B' / kTotal
Iz'       = Iz_tablo · kTotal

R_θ       = R₂₀ · (1 + α₂₀·(θ − 20))          θ = θ_max (PVC 70 / XLPE 90)
ΔU        = b · Ib · (L/1000) · (R_θ·cosφ + X·sinφ)     b: 2 (1F/DC) | √3 (3F L-L) | 1 (3F L-N)
ΔU%       = 100 · ΔU / U₀
sinφ      = √(max(0, 1 − cos²φ))

In        = min{ In ∈ katalog : In ≥ Ib }
I2        = In · i2Multiplier
koordinasyon: Ib ≤ In ≤ Iz'  ∧  I2 ≤ 1.45·Iz'

S_min_sc  = √(I²t) / k                        I²t: katalog veya Isc²·t
kısa devre: I²t ≤ k²·S²

S_PE      = max( √(I_f²·t)/k_PE , Tablo 54.7 )
Ia        = designMultiplier · In
Z_faz     = √(R_θ² + X²)                      Ω/km
Zs        = Z_kaynak + (Z_faz + Z_PE)·L/1000
L_max     = (U₀/Ia − Z_kaynak) / (Z_faz + Z_PE) · 1000
kesme:      Zs · Ia ≤ U₀

Z_kaynak: "estimated"  → 0.2·U₀/Ia            (kaynakta %80 gerilim varsayımı)
          "calculated" → U₀ / I_f
          "measured"   → kullanıcı girdisi

paralel n: R/n, X/n, Iz·n
```

**Sabitler** (`constants/index.ts`, zaten var, `decisions.md` frozen):
```
ρ_Cu20 = 0.01724   α_Cu20 = 0.00393
ρ_Al20 = 0.02826   α_Al20 = 0.00403
```
