import assert from "node:assert/strict";

import {
  exportCalculationsToExcel,
  exportCalculationsToJson,
  exportPresentationToPdf,
} from "./dist/index.js";
import { createCellXml } from "./dist/excel.js";
import { encodeUtf8 } from "./dist/shared.js";

const sampleMotorResult = {
  value: {
    mode: "formula",
    currentA: 15.2,
    apparentPowerKVA: 10.5,
  },
  warnings: [{ code: "input-rounded", messageKey: "motor.inputRounded", detail: "Display only" }],
  assumptions: [{ field: "efficiencyPercent", usedValue: 91, source: "default" }],
  formulaVariant: "iec-formula",
  dataVersion: "2026.04",
  engineVersion: "1.2.3",
};

const sampleExport = {
  version: {
    contractVersion: "1.0.0",
    engineVersion: "1.2.3",
    dataVersion: "2026.04",
  },
  exportedAt: "2026-04-19T20:00:00.000Z",
  groups: [],
  records: [
    {
      id: "motor-1",
      calculator: "motor",
      title: "Main Pump Motor",
      version: {
        contractVersion: "1.0.0",
        engineVersion: "1.2.3",
        dataVersion: "2026.04",
      },
      input: {
        mode: "formula",
        phase: 3,
        P_out: 7.5,
        voltage: 400,
        cosPhi: 0.85,
        efficiencyPercent: 91,
        voltageMode: "LL",
      },
      output: sampleMotorResult,
    },
    {
      id: "protection-1",
      calculator: "protection",
      title: "Branch Protection",
      version: {
        contractVersion: "1.0.0",
      },
      input: {
        minimumNominalCurrentA: 16,
        families: ["MCB"],
      },
      output: [
        {
          id: "mcb-16",
          family: "MCB",
          curve: "C",
          ratings: {
            nominalCurrentA: 16,
            breakingCapacityKa: 6,
            residualCurrentMa: null,
            voltageV: 400,
            poles: 3,
          },
          sourceNote: "IEC sample",
          device: {
            id: "mcb-16",
            family: "MCB",
            poles: 3,
            nominalCurrentA: 16,
            breakingCapacityKa: 6,
            curve: "C",
            residualCurrentMa: null,
            voltageV: 400,
            sourceNote: "IEC sample",
          },
        },
      ],
    },
  ],
};

const json = exportCalculationsToJson(sampleExport);
assert.deepEqual(JSON.parse(Buffer.from(json.data).toString("utf8")), sampleExport);

const excel = exportCalculationsToExcel(sampleExport);
const excelXml = Buffer.from(excel.data).toString("utf8");
assert.match(excelXml, /Worksheet ss:Name="Motor"/);
assert.match(excelXml, /Worksheet ss:Name="Protection"/);
assert.match(excelXml, /input\.phase/);
assert.match(excelXml, /output\.formulaVariant/);
assert.match(excelXml, /warnings\[0\]\.input-rounded/);
// The "body" style is defined in the workbook's <Styles> but must also be applied to
// data-row cells (it was defined but never wired up to any cell).
assert.match(excelXml, /<Cell ss:StyleID="body">/);

const pdf = exportPresentationToPdf({
  title: "Calculation Summary",
  subtitle: "Pre-rounded values only",
  exportedAt: "2026-04-19 23:00 +03:00",
  records: [
    {
      id: "motor-1",
      calculator: "motor",
      title: "Main Pump Motor",
      sections: [
        {
          title: "Inputs",
          rows: [
            { label: "Voltage", value: "400 V" },
            { label: "Power", value: "7.50 kW" },
          ],
        },
        {
          title: "Outputs",
          rows: [{ label: "Current", value: "15.20 A" }],
        },
      ],
    },
  ],
});
const pdfText = Buffer.from(pdf.data).toString("utf8");
assert.match(pdfText, /^%PDF-1\.4/);
assert.match(pdfText, /Calculation Summary/);
assert.match(pdfText, /15\.20 A/);

// Regression: /Length must be the UTF-8 byte count of the stream content, not the
// JS string's UTF-16 code-unit count. Turkish characters (ğ, ş, ı, ö, ü, ç) take
// more bytes than code units, so this only fails if the byte-length bug regresses.
const pdfWithTurkishText = exportPresentationToPdf({
  title: "Hesaplama Özeti",
  subtitle: "Şebeke gerilim düşümü",
  records: [
    {
      id: "cable-1",
      calculator: "cable",
      title: "Öğütücü Besleme Hattı",
      sections: [
        {
          title: "Girdiler",
          rows: [
            { label: "İletken Malzeme", value: "Bakır" },
            { label: "Döşeme Yöntemi", value: "Hava üzeri, gölgeli ortam" },
          ],
        },
      ],
    },
  ],
});
const rawPdfBytes = Buffer.from(pdfWithTurkishText.data).toString("latin1");
const streamRegex = /<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g;
let turkishStreamMatch;
let checkedAtLeastOneStream = false;

while ((turkishStreamMatch = streamRegex.exec(rawPdfBytes)) !== null) {
  checkedAtLeastOneStream = true;
  const declaredLength = Number(turkishStreamMatch[1]);
  const actualByteLength = turkishStreamMatch[2].length;
  assert.equal(
    declaredLength,
    actualByteLength,
    `/Length ${declaredLength} does not match actual stream byte length ${actualByteLength}`,
  );
}

assert.ok(checkedAtLeastOneStream, "expected at least one PDF content stream to check");

// Regression: SpreadsheetML Boolean cells must render "1"/"0", not "true"/"false".
// (Unreachable via exportCalculationsToExcel today since all cells are built from
// pre-stringified values, but createCellXml must still be correct if a boolean/number
// cell is ever produced directly — see excel.ts inferCellType/createCellXml.)
assert.match(createCellXml({ value: true }), /<Data ss:Type="Boolean">1<\/Data>/);
assert.match(createCellXml({ value: false }), /<Data ss:Type="Boolean">0<\/Data>/);

// encodeUtf8 must correctly encode supplementary-plane (surrogate-pair) code points,
// e.g. an emoji, as 4-byte UTF-8 sequences — the exact standard TextEncoder implements.
assert.deepEqual(Array.from(encodeUtf8("😀")), [0xf0, 0x9f, 0x98, 0x80]);
assert.deepEqual(Array.from(encodeUtf8("ğşıöüç")), Array.from(new TextEncoder().encode("ğşıöüç")));

console.log("exporters smoke tests passed");
