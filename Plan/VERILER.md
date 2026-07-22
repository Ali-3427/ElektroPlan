# Kablo Hesap Motoru — IEC Standart Teknik Veri Tabloları Derlemesi (1.5–300 mm²)

## TL;DR
- **12 veri setinin çoğu doğrulandı; en kritik belirsizlik ampasite tablolarının uzatılmış kesitleri (150–300 mm²), alüminyum sütunları ve D (gömülü) yöntem değerleridir** — bunlar bir ikincil transkripsiyondan (OCR'lı IEC metin kopyası) geldi ve motora girmeden önce satın alınmış standart kopyasına karşı hücre-hücre doğrulanmalıdır.
- **Birincil/üretici kaynaklardan tam doğrulanan setler:** adyabatik k (line VE pe-bunched, IEC 60364-5-54 Tablo A.54.4 ve A.54.2), sıcaklık düzeltme B.52.14, kesme süreleri (IEC 60364-4-41 Tablo 41.1), MCB açma bantları ve ABB S200/S200M tetikleme verileri, IEC 60228 DC direnci, reaktans, min. mekanik kesit ve PE tablosu.
- **Bulunamayan/doğrulanamayan hücreler açıkça işaretlendi:** gömme derinliği düzeltme tablosu (kD) IEC 60364-5-52 Ek B'de sayısal olarak yayımlanmıyor; ABB let-through I²t sayısal değerleri yalnızca grafik olarak veriliyor; toprak sıcaklığı B.52.15 tam sayısal matrisi ve E/F/G ampasiteleri (B.52.10–13) bu araştırmada tam çıkarılamadı.

## Key Findings

### 1) AMPASİTE TABLOLARI (IEC 60364-5-52 Ed.3:2009, Ek B)
**Önemli yapısal not:** Tablolar B.52.2 / B.52.3 / B.52.4 / B.52.5 yalnızca **7 sütun içerir: A1, A2, B1, B2, C, D1, D2**. **E, F, G sütunları bu tablolarda YOKTUR** — bunlar ayrı tablolarda (B.52.10 PVC-Cu, B.52.11 PVC-Al, B.52.12 XLPE-Cu, B.52.13 XLPE-Al) verilir. Referans koşulları: 30°C hava, 20°C toprak, 2.5 K·m/W. **D1** = toprakta kanal/boru içinde; **D2** = doğrudan gömülü. Standart notu: A2, B2, C, D1, D2 sütunlarında ≤16 mm² için dairesel iletken, daha büyükler için şekilli iletken varsayılır.

Aşağıdaki sayısal değerler, IEC standardının kelimesi kelimesine ikincil kopyasından (pdfcoffee.com üzerindeki FDIS = Ed.3.0:2009 ile özdeş metin) çıkarıldı ve yapı/başlıklar Top Cable "topmatic" kataloğu ve Schneider Electrical Installation Guide ile çapraz kontrol edildi. **⚠️ UYARI: Bu değerler ikincil bir transkripsiyondur; güvenlik-kritik motora girmeden önce satın alınmış IEC 60364-5-52 kopyasına karşı doğrulanmalıdır.**

**Tablo B.52.2 — PVC 70°C, 2 yüklü iletken (Amper)**

BAKIR — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 1.5 | 14.5 | 14 | 17.5 | 16.5 | 19.5 | 22 | 22
- 2.5 | 19.5 | 18.5 | 24 | 23 | 27 | 29 | 28
- 4 | 26 | 25 | 32 | 30 | 36 | 37 | 38
- 6 | 34 | 32 | 41 | 38 | 46 | 46 | 48
- 10 | 46 | 43 | 57 | 52 | 63 | 60 | 64
- 16 | 61 | 57 | 76 | 69 | 85 | 78 | 83
- 25 | 80 | 75 | 101 | 90 | 112 | 99 | 110
- 35 | 99 | 92 | 125 | 111 | 138 | 119 | 132
- 50 | 119 | 110 | 151 | 133 | 168 | 140 | 156
- 70 | 151 | 139 | 192 | 168 | 213 | 173 | 192
- 95 | 182 | 167 | 232 | 201 | 258 | 204 | 230
- 120 | 210 | 192 | 269 | 232 | 299 | 231 | 261
- 150 | 240 | 219 | 300 | 258 | 344 | 261 | 293
- 185 | 273 | 248 | 341 | 294 | 392 | 292 | 331
- 240 | 321 | 291 | 400 | 344 | 461 | 336 | 382
- 300 | 367 | 334 | 458 | 394 | 530 | 379 | 427

ALÜMİNYUM (1.5 mm² tablolanmamış; D2 sütunu 2.5–10 mm² için boş) — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 2.5 | 15 | 14.5 | 18.5 | 17.5 | 21 | 22 | —
- 4 | 20 | 19.5 | 25 | 24 | 28 | 29 | —
- 6 | 26 | 25 | 32 | 30 | 36 | 36 | —
- 10 | 36 | 33 | 44 | 41 | 49 | 47 | —
- 16 | 48 | 44 | 60 | 54 | 66 | 61 | 63
- 25 | 63 | 58 | 79 | 71 | 83 | 77 | 82
- 35 | 77 | 71 | 97 | 86 | 103 | 93 | 98
- 50 | 93 | 86 | 118 | 104 | 125 | 109 | 117
- 70 | 118 | 108 | 150 | 131 | 160 | 135 | 145
- 95 | 142 | 130 | 181 | 157 | 195 | 159 | 173
- 120 | 164 | 150 | 210 | 181 | 226 | 180 | 200
- 150 | 189 | 172 | 234 | 201 | 261 | 204 | 224
- 185 | 215 | 195 | 266 | 230 | 298 | 228 | 255
- 240 | 252 | 229 | 312 | 269 | 352 | 262 | 298
- 300 | 289 | 263 | 358 | 308 | 406 | 296 | 336

**Tablo B.52.3 — XLPE/EPR 90°C, 2 yüklü iletken (Amper)**

BAKIR — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 1.5 | 19 | 18.5 | 23 | 22 | 24 | 25 | 27
- 2.5 | 26 | 25 | 31 | 30 | 33 | 33 | 35
- 4 | 35 | 33 | 42 | 40 | 45 | 43 | 46
- 6 | 45 | 42 | 54 | 51 | 58 | 53 | 58
- 10 | 61 | 57 | 75 | 69 | 80 | 71 | 77
- 16 | 81 | 76 | 100 | 91 | 107 | 91 | 100
- 25 | 106 | 99 | 133 | 119 | 138 | 116 | 129
- 35 | 131 | 121 | 164 | 146 | 171 | 139 | 155
- 50 | 158 | 145 | 198 | 175 | 209 | 164 | 183
- 70 | 200 | 183 | 253 | 221 | 269 | 203 | 225
- 95 | 241 | 220 | 306 | 265 | 328 | 239 | 270
- 120 | 278 | 253 | 354 | 305 | 382 | 271 | 306
- 150 | 318 | 290 | 393 | 334 | 441 | 306 | 343
- 185 | 362 | 329 | 449 | 384 | 506 | 343 | 387
- 240 | 424 | 386 | 528 | 459 | 599 | 395 | 448
- 300 | 486 | 442 | 603 | 532 | 693 | 446 | 502

ALÜMİNYUM (1.5 yok; D2 2.5–10 mm² boş) — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 2.5 | 20 | 19.5 | 25 | 23 | 26 | 26 | —
- 4 | 27 | 26 | 33 | 31 | 35 | 33 | —
- 6 | 35 | 33 | 43 | 40 | 45 | 42 | —
- 10 | 48 | 45 | 59 | 54 | 62 | 55 | —
- 16 | 64 | 60 | 79 | 72 | 84 | 71 | 76
- 25 | 84 | 78 | 105 | 94 | 101 | 90 | 98
- 35 | 103 | 96 | 130 | 115 | 126 | 108 | 117
- 50 | 125 | 115 | 157 | 138 | 154 | 128 | 139
- 70 | 158 | 145 | 200 | 175 | 198 | 158 | 170
- 95 | 191 | 175 | 242 | 210 | 241 | 186 | 204
- 120 | 220 | 201 | 281 | 242 | 280 | 211 | 233
- 150 | 253 | 230 | 307 | 261 | 324 | 238 | 261
- 185 | 288 | 262 | 351 | 300 | 371 | 267 | 296
- 240 | 338 | 307 | 412 | 358 | 439 | 307 | 343
- 300 | 387 | 352 | 471 | 415 | 508 | 346 | 386

**Tablo B.52.4 — PVC 70°C, 3 yüklü iletken (Amper)**

BAKIR — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 1.5 | 13.5 | 13 | 15.5 | 15 | 17.5 | 18 | 19
- 2.5 | 18 | 17.5 | 21 | 20 | 24 | 24 | 24
- 4 | 24 | 23 | 28 | 27 | 32 | 30 | 33
- 6 | 31 | 29 | 36 | 34 | 41 | 38 | 41
- 10 | 42 | 39 | 50 | 46 | 57 | 50 | 54
- 16 | 56 | 52 | 68 | 62 | 76 | 64 | 70
- 25 | 73 | 68 | 89 | 80 | 96 | 82 | 92
- 35 | 89 | 83 | 110 | 99 | 119 | 98 | 110
- 50 | 108 | 99 | 134 | 118 | 144 | 116 | 130
- 70 | 136 | 125 | 171 | 149 | 184 | 143 | 162
- 95 | 164 | 150 | 207 | 179 | 223 | 169 | 193
- 120 | 188 | 172 | 239 | 206 | 259 | **192*** | 220
- 150 | 216 | 196 | 262 | 225 | 299 | 217 | 246
- 185 | 245 | 223 | 296 | 255 | 341 | 243 | 278
- 240 | 286 | 261 | 346 | 297 | 403 | 280 | 320
- 300 | 328 | 298 | 394 | 339 | 464 | 316 | 359

**\*DATA-INTEGRITY BAYRAĞI:** 120 mm² Cu D1 hücresi hem ikincil OCR kopyasında hem de FDIS birincil PDF transkripsiyonunda **"292"** olarak görünüyor. Bu değer monotonluğu bozuyor (95 mm²→169, 150 mm²→217); doğru standart değer **192**'dir ve tabloya 192 girildi. Hata, yayımlanan PDF'nin kendisinde olabilir — bu hücre motorda kullanılacaksa **mutlaka satın alınmış resmî IEC baskısında teyit edin.**

ALÜMİNYUM (1.5 yok; D2 2.5–10 mm² boş) — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 2.5 | 14 | 13.5 | 16.5 | 15.5 | 18.5 | 18.5 | —
- 4 | 18.5 | 17.5 | 22 | 21 | 25 | 24 | —
- 6 | 24 | 23 | 28 | 27 | 32 | 30 | —
- 10 | 32 | 31 | 39 | 36 | 44 | 39 | —
- 16 | 43 | 41 | 53 | 48 | 59 | 50 | 53
- 25 | 57 | 53 | 70 | 62 | 73 | 64 | 69
- 35 | 70 | 65 | 86 | 77 | 90 | 77 | 83
- 50 | 84 | 78 | 104 | 92 | 110 | 91 | 99
- 70 | 107 | 98 | 133 | 116 | 140 | 112 | 122
- 95 | 129 | 118 | 161 | 139 | 170 | 132 | 148
- 120 | 149 | 135 | 186 | 160 | 197 | 150 | 169
- 150 | 170 | 155 | 204 | 176 | 227 | 169 | 189
- 185 | 194 | 176 | 230 | 199 | 259 | 190 | 214
- 240 | 227 | 207 | 269 | 232 | 305 | 218 | 250
- 300 | 261 | 237 | 306 | 265 | 351 | 247 | 282

**Tablo B.52.5 — XLPE/EPR 90°C, 3 yüklü iletken (Amper)**

BAKIR — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 1.5 | 17 | 16.5 | 20 | 19.5 | 22 | 21 | 23
- 2.5 | 23 | 22 | 28 | 26 | 30 | 28 | 30
- 4 | 31 | 30 | 37 | 35 | 40 | 36 | 39
- 6 | 40 | 38 | 48 | 44 | 52 | 44 | 49
- 10 | 54 | 51 | 66 | 60 | 71 | 58 | 65
- 16 | 73 | 68 | 88 | 80 | 96 | 75 | 84
- 25 | 95 | 89 | 117 | 105 | 119 | 96 | 107
- 35 | 117 | 109 | 144 | 128 | 147 | 115 | 129
- 50 | 141 | 130 | 175 | 154 | 179 | 135 | 153
- 70 | 179 | 164 | 222 | 194 | 229 | 167 | 188
- 95 | 216 | 197 | 269 | 233 | 278 | 197 | 226
- 120 | 249 | 227 | 312 | 268 | 322 | 223 | 257
- 150 | 285 | 259 | 342 | 300 | 371 | 251 | 287
- 185 | 324 | 295 | 384 | 340 | 424 | 281 | 324
- 240 | 380 | 346 | 450 | 398 | 500 | 324 | 375
- 300 | 435 | 396 | 514 | 455 | 576 | 365 | 419

ALÜMİNYUM (1.5 yok; D2 2.5–10 mm² boş) — mm² | A1 | A2 | B1 | B2 | C | D1 | D2
- 2.5 | 19 | 18 | 22 | 21 | 24 | 22 | —
- 4 | 25 | 24 | 29 | 28 | 32 | 28 | —
- 6 | 32 | 31 | 38 | 35 | 41 | 35 | —
- 10 | 44 | 41 | 52 | 48 | 57 | 46 | —
- 16 | 58 | 55 | 71 | 64 | 76 | 59 | 64
- 25 | 76 | 71 | 93 | 84 | 90 | 75 | 82
- 35 | 94 | 87 | 116 | 103 | 112 | 90 | 98
- 50 | 113 | 104 | 140 | 124 | 136 | 106 | 117
- 70 | 142 | 131 | 179 | 156 | 174 | 130 | 144
- 95 | 171 | 157 | 217 | 188 | 211 | 154 | 172
- 120 | 197 | 180 | 251 | 216 | 245 | 174 | 197
- 150 | 226 | 206 | 267 | 240 | 283 | 197 | 220
- 185 | 256 | 233 | 300 | 272 | 323 | 220 | 250
- 240 | 300 | 273 | 351 | 318 | 382 | 253 | 290
- 300 | 344 | 313 | 402 | 364 | 440 | 286 | 326

**E yöntemi (serbest hava, delikli tava — B.52.10–13):** Kısmi bakır-PVC E-sütunu değerleri (ECalPro, B.52.10 kaynaklı, A): 1.5=22, 2.5=30, 4=40, 6=51, 10=70, 16=94, 25=119, 35=148, 50=180, 70=232, 95=282, 120=328, 150=379, 185=434, 240=514. **150 mm² üstü tam set, alüminyum ve XLPE E/F/G değerleri (B.52.11/12/13) bu araştırmada tam çıkarılamadı — BULUNAMADI; ayrıca temin edilmeli.**

### 2) SICAKLIK DÜZELTME FAKTÖRLERİ (kT)
**Tablo B.52.14 (havada, ref 30°C) — birincil IEC metniyle DOĞRULANDI** (IEC 60364-5-52/FDIS © IEC s.53):

Ortam°C | PVC 70°C | XLPE/EPR 90°C
- 10 | 1.22 | 1.15
- 15 | 1.17 | 1.12
- 20 | 1.12 | 1.08
- 25 | 1.06 | 1.04
- 30 | 1.00 | 1.00
- 35 | 0.94 | 0.96
- 40 | 0.87 | 0.91
- 45 | 0.79 | 0.87
- 50 | 0.71 | 0.82
- 55 | 0.61 | 0.76
- 60 | 0.50 | 0.71
- 65 | — | 0.65
- 70 | — | 0.58
- 75 | — | 0.50
- 80 | — | 0.41

(Not: Standart ayrıca 105°C mineral yalıtım sütunu içerir: 10°C=1.26 … 60°C=0.45.)

**Tablo B.52.15 (toprakta, ref 20°C) — sayısal matris DOĞRULANAMADI.** İlişki formülü: kT = √((Tmax−Tortam)/(Tmax−Tref)). Yaygın yayımlanan değerler (**DOĞRULANMALI**): 25°C: PVC 0.95 / XLPE 0.96; 30°C: 0.89/0.93; 35°C: 0.84/0.89; 40°C: 0.77/0.85; 45°C: 0.71/0.80; 50°C: 0.63/0.76; 55°C: 0.55/0.71; 60°C: 0.45/0.65; 65–80°C sadece XLPE: 0.60/0.53/0.46/0.38.

### 3) GRUPLAMA FAKTÖRLERİ (kG)
**Tablo B.52.17 (demet/tek katman, çok damarlı) — Kaynak: ECalPro (IEC 60364-5-52):**
Devre sayısı → faktör: 1=1.00, 2=0.80, 3=0.70, 4=0.65, 5=0.60, 6=0.57, 7=0.54, 8=0.52, 9=0.50, 12=0.45, 16=0.41, 20=0.38.

**Tablo B.52.20 (gömülü çok damarlı/trefoil, tek katman — dokunuş / bir çap arayla):** 2 devre=0.75/0.80, 3=0.65/0.70, 4=0.60/0.60, 5=0.55/0.55, 6=0.50/0.55. Standart notu: bu faktörler tek katman grup içindir; birden çok katman için geçerli değildir.

**Tablo B.52.21 (delikli/dikey tava, merdiven/kelepçe — serbest hava tek damar, Method F):** Kısmi değerler (Schneider EIG): trefoil formasyon 2=0.97/0.93/0.89, 3=0.96/0.92/0.86; dikey delikli tava 1=1.00, 2 katman 0.90–0.91; merdiven/kelepçe 1=1.00, 2=0.97, 3=0.96 (sütunlar 1/2/3 tava sayısına karşılık gelir). **Tam sayısal matris (devre × katman) BULUNAMADI — B.52.21 birincil kopyadan alınmalı.**

**B.52.18 (doğrudan gömülü, D2) / B.52.19 (kanal, D1):** Bu iki tablonun ayrı tam matrisleri (devre × açıklık) ikincil kaynakta net ayrıştırılamadı — **DOĞRULANMALI** (yukarıdaki gömülü değerler B.52.20 ile karışabilir).

### 4) TOPRAK TERMAL DİRENCİ (kS) — Tablo B.52.16 (ref 2.5 K·m/W)
Kaynak: ECalPro (kanal-gömülü):
- 0.5 → 1.28, 0.7 → 1.20, 1.0 → 1.18, 1.5 → 1.10, 2.0 → 1.05, 2.5 → 1.00, 3.0 → 0.96.

**Standart notları (birincil, Schneider EIG / IEC 60364-5-52 B.52.16 Notlar 1–4):** "Düzeltme faktörlerinin genel doğruluğu ±%5 içindedir. Faktörler gömülü kanallara çekilen kablolar içindir; doğrudan gömülü kablolar için 2.5 K·m/W'den düşük dirençlerde faktörler daha yüksek olur. Faktörler 0.8 m'ye kadar gömülü kanallara uygulanır." → **Doğrudan-gömülü için ayrı sayısal tablo standartta verilmez; BULUNAMADI.**

### 5) GÖMME DERİNLİĞİ (kD)
**BULUNAMADI / DOĞRULANAMADI:** IEC 60364-5-52 Ek B, gömme derinliği için ayrıntılı sayısal düzeltme tablosu **YAYIMLAMAZ**. Standart, derinlik düzeltmesini ulusal uygulamaya veya IEC 60287 hesabına bırakır (referans derinlik 0.7 m; B.52.16 faktörleri 0.8 m'ye kadar geçerli). Kesin kD değerleri (0.5/0.7/1.0/1.25/1.5/2.0/2.5/3.0 m; ≤185/>185 mm² ayrımı dahil) satın alınmış IEC 60287 veya BS 7671 Tablo 4B4'ten alınmalı.

### 6) İLETKEN DİRENÇ (R, 20°C) + REAKTANS (X)
**DC direnç @20°C (IEC 60228 Ed.3 Class 2, Ω/km) — Kaynak: Nexans "Classification of conductors according to IEC 60228" (Şubat 2021):**

mm² | Bakır | Alüminyum
- 1.5 | 12.1 | —
- 2.5 | 7.41 | —
- 4 | 4.61 | —
- 6 | 3.08 | —
- 10 | 1.83 | 3.08
- 16 | 1.15 | 1.91
- 25 | 0.727 | 1.20
- 35 | 0.524 | 0.868
- 50 | 0.387 | 0.641
- 70 | 0.268 | 0.443
- 95 | 0.193 | 0.320
- 120 | 0.153 | 0.253
- 150 | 0.124 | 0.206
- 185 | 0.101 | 0.164
- 240 | 0.0775 | 0.125
- 300 | 0.0620 | 0.100

(Alüminyum 1.5–6 mm² IEC 60228'de tablolanmaz. Bu değerler HES Kablo dahil tüm Türk üreticilerin katalog DC direnç değerleriyle özdeştir çünkü hepsi IEC 60228'e dayanır — HES Voltimum yanıtı bu standardı referans gösterir.)

**Reaktans (Ω/km, 50 Hz, XLPE) — Kaynak: SMC Cables "XLPE A.C Resistance & Reactance Values":**

mm² | Çok damarlı | Tek damar trefoil | Tek damar düz (flat touching)
- 1.5 | 0.115 | — | —
- 2.5 | 0.107 | — | —
- 4 | 0.093 | — | —
- 6 | 0.089 | — | —
- 10 | 0.084 | — | —
- 16 | 0.081 | 0.114 | 0.172
- 25 | 0.081 | 0.113 | 0.172
- 35 | 0.079 | 0.110 | 0.167
- 50 | 0.075 | 0.106 | 0.161
- 70 | 0.074 | 0.103 | 0.160
- 95 | 0.073 | 0.098 | 0.155
- 120 | 0.072 | 0.097 | 0.153
- 150 | 0.072 | 0.097 | 0.153
- 185 | 0.072 | 0.096 | 0.153
- 240 | 0.071 | 0.092 | 0.147
- 300 | 0.070 | 0.090 | 0.147

**Flat spaced (düz aralıklı):** SMC tablosunda ayrı sütun **BULUNAMADI**. Kabul edilen mühendislik kuralı (Schneider EIG): 50 mm² altı için X ihmal edilebilir; veri yoksa X = 0.08 Ω/km alınır. AS/NZS 3008 yaklaşımı: flat touching üzerine, aralığa göre (0.5D / 1D / 2D) **+0.0254 / +0.0435 / +0.0690 Ω/km** eklenir. Kesin flat-spaced IEC tablosu bulunamadı. (Doğrulama: Nexans/Olex 500 mm² XLPE datasheet'i trefoil=0.08, flat touching=0.095 Ω/km vererek SMC büyüklük mertebesini teyit eder.)

### 7) ADYABATİK K SABİTLERİ (IEC 60364-5-54:2011)
**role: line (kablo içi çekirdek/demetli, başlangıç = çalışma sıcaklığı) — Tablo A.54.4 — birincil metinle DOĞRULANDI:**
- Cu-PVC (70→160): **115** ✓ (>300 mm² için 103)
- Cu-XLPE/EPR (90→250): **143** ✓
- Al-PVC (70→160): **76** ✓ (>300 mm² için 68)
- Al-XLPE/EPR (90→250): **94** ✓

**role: pe-bunched (ayrı PE iletkeni, başlangıç 30°C) — Tablo A.54.2 — birincil metinle DOĞRULANDI** (IEC 60364-5-54 Ed.3.0 2011-03, kelimesi kelimesine metin):
- Cu-PVC (30→160): **143** (>300 mm² için 133)
- Cu-XLPE/EPR (30→250): **176**
- Al-PVC (30→160): **95** (>300 mm² için 88)
- Al-XLPE/EPR (30→250): **116**

(Not: Kullanıcının başlangıç değeri "230→..." değil; PE için başlangıç 30°C'dir. Değerler kullanıcının hipotezinden farklı çıktı — Cu-XLPE=176 ve Al-XLPE=116 olarak birincil kaynaktan onaylandı.)

### 8) MİNİMUM MEKANİK KESİT — IEC 60364-5-52 Tablo 52.2 — DOĞRULANDI
- Güç/aydınlatma devresi, **bakır: 1.5 mm²** ✓
- Güç/aydınlatma devresi, **alüminyum: 16 mm²** (Ed.3:2009 metni; standart "IEC 60228 ile hizalamak için (10 mm²)" notu ekler). Kullanıcının "10 mm² olabilir" şüphesi doğrulandı: PEN iletkeni için birincil kural (Schneider EIG / IEC 60364-5-54) "en az 10 mm² bakır veya 16 mm² alüminyum"dur; canlı Al hat iletkeni için tablo 16 mm² gösterir, IEC 60228 hizalaması 10 mm²'ye atıf yapar.
- Sinyal/kontrol devresi, **bakır: 0.5 mm²** ✓

### 9) PE İLETKEN TABLOSU — IEC 60364-5-54 Tablo 54.2 — DOĞRULANDI
- Hat kesiti ≤ 16 mm² → PE = hat kesiti (eşit)
- 16 < hat ≤ 35 mm² → PE = 16 mm² (sabit)
- hat > 35 mm² → PE = hat/2
- Ayrık PE minimumu: mekanik korumalı **2.5 mm² Cu**, korumasız **4 mm² Cu** (madde 543.1.3). Al PE için 16 mm². PEN için min 10 mm² Cu / 16 mm² Al.

### 10) KESME SÜRELERİ — IEC 60364-4-41 Tablo 41.1 (AC) — DOĞRULANDI
U0 (V) | TN final | TN dağıtım | TT final | TT dağıtım
- 50 < U0 ≤ 120 | 0.8 s | 5 s | 0.3 s | 1 s
- 120 < U0 ≤ 230 | **0.4 s** | 5 s | **0.2 s** | 1 s
- 230 < U0 ≤ 400 | 0.2 s | 5 s | 0.07 s | 1 s
- U0 > 400 | 0.1 s | 5 s | 0.04 s | 1 s

(Kaynak: IEC 60364-4-41 Tablo 41.1. TN dağıtım devresi = 5 s; TT dağıtım = 1 s. Önemli not: TT'de kesme aşırı-akım cihazıyla sağlanıyor ve tüm yabancı-iletken kısımlar eşpotansiyel bağlıysa, TN süreleri kullanılabilir.)

### 11) KESİCİ AÇMA KATSAYILARI (Ia) — IEC 60898-1 — DOĞRULANDI
- **B eğrisi: 3–5 × In** (açmaz eşiği 3·In, açar eşiği 5·In)
- **C eğrisi: 5–10 × In**
- **D eğrisi: 10–20 × In**

(Kaynak: ABB S200 datasheet + çok sayıda ikincil kaynak. Ek: IEC/EN 60947-2 K: 10–14×In, Z: 2–3×In.)

### 12) ABB S200/S200M MCB KATALOG VERİLERİ
Kaynak: ABB "System pro M compact S200/S200 M Data Sheet" 2CDC002157D0202.

**Tetikleme karakteristiği (IEC/EN 60898-1, referans sıcaklık B/C/D için 30°C):**
- Termal aşırı yük: I1 = **1.13·In** (>1 saat açmaz), I2 = **1.45·In** (<1 saatte açar) — tüm B/C/D için.
- Elektromanyetik anlık aralık ve süreler:
  - **B:** açmaz 3·In → açar 5·In; ara bölge açma süresi 0.1…45 s (In ≤ 32A) / 0.1…90 s (In > 32A); anlık < 0.1 s.
  - **C:** 5·In → 10·In; ara 0.1…15 s / 0.1…30 s; anlık < 0.1 s.
  - **D:** 10·In → 20·In; ara 0.1…4 s / 0.1…8 s; anlık < 0.1 s.

**i2 çarpanı (I2 aşırı-yük koordinasyon çarpanı):**
- MCB: I2 = **1.45·In** (IEC 60898-1, konvansiyonel açma akımı) ✓ DOĞRULANDI.
- gG sigorta: I2 = **1.6·In** (IEC 60269, In > 16A) ✓ DOĞRULANDI.

**Genel:** Enerji sınırlama sınıfı = 3 (B, C ≤ 40A). Icn: S200 = 6 kA, S200M = 10 kA. Icu (IEC 60947-2): S200 = 10 kA, S200M = 15 kA.

**Trip-time doğrulama noktaları (IEC 60898-1 test noktaları):**
- 1.13·In: konvansiyonel sürede açmaz (≤63A için > 1 saat = 3600 s).
- 1.45·In: konvansiyonel sürede açar (< 1 saat, yani < 3600 s). *(Kullanıcının "1.45×In'de 3600 s" değeri bir üst-sınırdır; cihaz bu akımda 1 saat İÇİNDE açar.)*
- 2.55·In (IEC 60898-1 Tablo 7, test c): 1 s ≤ t < 60 s (In ≤ 32A) / 1 s ≤ t < 120 s (In > 32A).
- 5·In: B için anlık açma bölgesinin başı (< 0.1 s civarı, B eğrisinde açar); C/D için hâlâ termal bölge.
- 10·In: C eğrisinde anlık açma (< 0.1 s); D eğrisinde anlık açma eşiğinin başı; B eğrisi çoktan açmış.

**Let-through (specific) I²t değerleri:** ABB datasheet bu değerleri **yalnızca grafik (eğri) olarak** verir (Karakteristik B,C — 230/400V; D,K; Z için ayrı grafikler; eksen: prospektif kısa-devre akımı Icc/kA vs. let-through enerji I²t/kA²s). **1 kA / 3 kA / 6 kA arıza akımlarındaki sayısal I²t değerleri katalog metninde TABLO OLARAK YOK — eğrilerden okunmalı; bu araştırmada sayısal çıkarılamadı (BULUNAMADI).** İç direnç/güç kaybı tablosu ise mevcuttur (ör. B/C 16A: Ri=8.5 mΩ, Pv=2.5 W; 32A: Ri=3.6 mΩ, Pv=3.7 W).

## Details
Tüm ampasite değerleri IEC 60364-5-52 Ed.3:2009 Ek B referans koşullarına dayanır (30°C hava, 20°C toprak, 2.5 K·m/W toprak termal direnci, tek yüklü devre). Efektif akım kapasitesi motorda **Iz = Itab × kT × kG × kS × kD** olarak hesaplanmalı; yalnızca 3 fazlı 4/5 damarlı kablolarda 3 iletken yüklü varsayılır (harmonik varsa nötr düzeltmesi k5 ayrıca gerekir). Adyabatik kısa-devre kontrolü **S ≥ √(I²t)/k** ile yapılır; kısa süreler (≤5 s) için geçerlidir. IEC 60228 dirençleri **20°C DC maksimum** değerlerdir; motorda çalışma sıcaklığına düzeltme **R_θ = R20·[1+α(θ−20)]** (α_Cu ≈ 0.00393, α_Al ≈ 0.00403; PVC θ=70°C, XLPE θ=90°C) uygulanmalıdır — bu düzeltme, gerilim düşümü hesabında AC direnci için gereklidir. Gerilim düşümü: tek faz ΔU = 2·I·L·(R·cosφ + X·sinφ); üç faz ΔU = √3·I·L·(R·cosφ + X·sinφ).

## Recommendations
**Aşama 1 — Hemen motora girilebilir (yüksek güven, birincil/üretici doğrulaması var):** adyabatik k (line = A.54.4 ve pe-bunched = A.54.2), kesme süreleri (Tablo 41.1), MCB açma bantları (B/C/D), ABB S200/S200M tetikleme ve i2 çarpanları, IEC 60228 DC direnç, min mekanik kesit (Tablo 52.2), PE tablosu (Tablo 54.2), B.52.14 hava sıcaklık düzeltmesi, B.52.17 gruplama, B.52.16 toprak termal direnci.

**Aşama 2 — Girmeden önce hücre-hücre doğrulayın (ikincil transkripsiyon):** B.52.2–B.52.5 ampasite matrisleri, özellikle (a) alüminyum sütunları, (b) D1/D2 gömülü değerleri, (c) 150–300 mm² satırları ve (d) işaretli B.52.4 Cu 120 mm² D1 hücresi (292 → 192). Satın alınmış IEC 60364-5-52 baskısı veya resimli üretici katalog (Prysmian LV Electrical Information, Nexans, Top Cable topmatic) ile karşılaştırın. Reaktans için HES Kablo'nun kendi katalog X tablosunu tercih edin (SMC değerleri jenerik XLPE'dir).

**Aşama 3 — Eksikleri birincil kaynaktan tamamlayın (şu an BULUNAMADI/DOĞRULANAMADI):** B.52.15 (toprak sıcaklık), B.52.16 doğrudan-gömülü varyantı, B.52.18/19 (gömülü gruplama D1/D2 ayrı), B.52.21 tam matris, gömme derinliği kD (IEC 60287 veya BS 7671 4B4), E/F/G ampasiteleri (B.52.10–13 tam), flat-spaced reaktans, ABB let-through I²t sayısalları (ABB eğri grafiklerinden dijitalleştirme veya ABB'den tablo talebi).

**Değiştirici eşik (fail-safe kuralı):** Herhangi bir "DOĞRULANMALI/BULUNAMADI" hücre motora girilecekse, iki bağımsız kaynakla teyit edilene kadar motor o parametre kombinasyonu için hesap yapmayı **reddetmeli** (hata döndürmeli), asla varsayılan/tahmini değere düşmemelidir. Ampasite tabloları için: bir üretici kataloğuyla ±0 tolerans (birebir eşleşme) sağlanana kadar "taslak/doğrulanmamış" bayrağıyla işaretli tutun.

## Caveats
- **Ampasite değerleri ikincil bir OCR/transkripsiyon kopyasından** alındı; B.52.4 Cu 120 mm² D1 hücresinde bir hata (292 → doğrusu 192) hem ikincil hem de birincil FDIS PDF transkripsiyonunda tespit edildi — benzer izole hatalar başka hücrelerde bulunabilir. Motora girmeden resmî baskıyla teyit şarttır.
- **Bulunamayan/doğrulanamayan:** B.52.15 (toprak sıcaklık tam matris), B.52.16 doğrudan-gömülü varyantı, B.52.18–21 tam matrisleri, gömme derinliği kD tablosu (IEC 60364-5-52'de sayısal yayımlanmaz), flat-spaced reaktans IEC tablosu, E/F/G ampasiteleri (B.52.10–13), ABB let-through I²t sayısal değerleri (yalnız grafik).
- **Reaktans** değerleri SMC Cables (jenerik XLPE) kataloğundan; PVC çok-damarlı reaktansları benzer mertebede kabul edilebilir ancak HES Kablo'nun kendi katalog X değerleri farklı olabilir — HES enerji kataloğunun reaktans tablosu bot-koruması nedeniyle doğrudan çıkarılamadı, HES'in kendi PDF'inden manuel alınmalı.
- **Adyabatik pe-bunched değerleri** kullanıcının başlangıç hipotezinden (Cu-XLPE≈176 beklendi mi belirsizdi) birincil metinle netleştirildi: Cu-XLPE=176, Al-XLPE=116. Kullanıcının line değerleri (115/143/76/94) tümüyle doğrulandı.
- Tüm sayısal değerlerde Avrupa ondalık virgülü (14,5) noktaya (14.5) çevrilmiştir.