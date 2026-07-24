import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  AssumptionEntry,
  CableDetailedOptions,
  CableMethodCode,
  CableSelectRequest,
  CableSelectResponse,
  CableVoltageDropSystemType,
  ConductorArrangement,
  GroupingArrangement,
} from "../../bridge/types";
import { getBridge, isBridgeAvailable } from "../../bridge/client";
import { formatAmp, formatNumberTr, formatPercent } from "../../i18n/format";
import { queryKeys } from "../../query/keys";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { ErrorBanner } from "../../ui/ErrorBanner";
import { Field, fieldGrid } from "../../ui/Field";
import { NumberInput } from "../../ui/NumberInput";
import { ResultPanel } from "../../ui/ResultPanel";
import { ResultRow, resultGrid } from "../../ui/ResultRow";
import { Select } from "../../ui/Select";
import {
  CALCULATOR_EXAMPLE_DEFAULTS,
  examplePlaceholder,
  mergeAssumptions,
  normalizeExampleNumber,
} from "../shared/calculatorDefaults";
import { usePersistentPageState } from "../shared/usePersistentPageState";
import styles from "./CableSelectMode.module.css";

const PHASE_OPTIONS = [
  { value: "1", label: "Tek Fazlı (1Φ)" },
  { value: "3", label: "Üç Fazlı (3Φ)" },
];

const MATERIAL_OPTIONS = [
  { value: "copper", label: "Bakır" },
  { value: "aluminum", label: "Alüminyum" },
];

const INSULATION_OPTIONS: { value: "PVC" | "XLPE/EPR"; label: string }[] = [
  { value: "PVC", label: "PVC (70°C)" },
  { value: "XLPE/EPR", label: "XLPE / EPR (90°C)" },
];

const SYSTEM_TYPE_OPTIONS: { value: CableVoltageDropSystemType; label: string }[] = [
  { value: "single-phase-ac-two-conductor", label: "Tek Fazlı AC (2 İletken)" },
  { value: "three-phase-ac-ll", label: "Üç Fazlı AC - Hat-Hat (LL)" },
  { value: "three-phase-ac-ln", label: "Üç Fazlı AC - Hat-Nötr (LN)" },
];

const GROUPING_ARRANGEMENT_OPTIONS: { value: GroupingArrangement; label: string }[] = [
  { value: "bunched", label: "Demet Halinde" },
  { value: "single-layer-tray-horizontal", label: "Tek Katman Kablo Tavası (Yatay)" },
  { value: "buried-in-ducts", label: "Kanalda Gömülü" },
];

const CABLE_METHOD_DESCRIPTIONS: Record<CableMethodCode, string> = {
  A1: "Isı yalıtımlı duvar içinde boruda",
  A2: "Isı yalıtımlı duvar içinde çok damarlı kablo",
  B1: "Boru/kanal içinde tek damarlı",
  B2: "Boru/kanal içinde çok damarlı",
  C: "Duvar veya yüzey üzerinde",
  D1: "Toprak altında (doğrudan gömülü)",
  D2: "Toprak altında (kanal/boru içinde)",
};

const FALLBACK_METHOD_CODES: readonly CableMethodCode[] = ["A1", "A2", "B1", "B2", "C", "D1", "D2"];

function isCableMethodCode(value: string): value is CableMethodCode {
  return (FALLBACK_METHOD_CODES as readonly string[]).includes(value);
}

function resolveMethods(queried: readonly string[] | undefined): CableMethodCode[] {
  if (queried && queried.includes("D1") && queried.includes("D2")) {
    return queried.filter(isCableMethodCode);
  }
  return [...FALLBACK_METHOD_CODES];
}

const EARTHING_OPTIONS: { value: "TN" | "TT"; label: string }[] = [
  { value: "TN", label: "TN" },
  { value: "TT", label: "TT" },
];

const CIRCUIT_ROLE_OPTIONS: { value: "final" | "distribution"; label: string }[] = [
  { value: "final", label: "Son Devre" },
  { value: "distribution", label: "Dağıtım Devresi" },
];

const BREAKER_CURVE_OPTIONS: { value: "B" | "C" | "D"; label: string }[] = [
  { value: "B", label: "B Eğrisi" },
  { value: "C", label: "C Eğrisi" },
  { value: "D", label: "D Eğrisi" },
];

const PE_LOCATION_OPTIONS: { value: "in-cable" | "separate"; label: string }[] = [
  { value: "in-cable", label: "Kablo İçinde" },
  { value: "separate", label: "Ayrı İletken" },
];

const CONDUCTOR_ARRANGEMENT_OPTIONS: { value: ConductorArrangement; label: string }[] = [
  { value: "multicore", label: "Çok Damarlı (Multicore)" },
  { value: "singleCoreTrefoil", label: "Tek Damarlı - Üçgen (Trefoil)" },
  { value: "singleCoreFlatTouching", label: "Tek Damarlı - Yan Yana (Flat)" },
];

const LOOP_IMPEDANCE_METHOD_OPTIONS: { value: "estimated" | "calculated" | "measured"; label: string }[] = [
  { value: "estimated", label: "Tahmini" },
  { value: "calculated", label: "Hesaplanmış" },
  { value: "measured", label: "Ölçülmüş" },
];

interface CableSelectDetailedState {
  readonly earthingSystem: "TN" | "TT";
  readonly circuitRole: "final" | "distribution";
  readonly breakerCurve: "B" | "C" | "D";
  readonly peLocation: "in-cable" | "separate";
  readonly conductorArrangement: ConductorArrangement;
  readonly parallelConductors: number | null;
  readonly soilThermalResistivityKmPerW: number | null;
  readonly burialDepthM: number | null;
  readonly prospectiveFaultKa: number | null;
  readonly clearingTimeS: number | null;
  readonly loopImpedanceMethod: "estimated" | "calculated" | "measured";
  readonly prospectiveEarthFaultKa: number | null;
  readonly sourceImpedanceOhm: number | null;
}

interface CableSelectPageState {
  readonly designCurrentA: number | null;
  readonly phase: "1" | "3";
  readonly conductorMaterial: "copper" | "aluminum";
  readonly insulation: "PVC" | "XLPE/EPR";
  readonly installationMethod: CableMethodCode;
  readonly ambientTemperatureC: number | null;
  readonly groupedCircuits: number | null;
  readonly groupingArrangement: GroupingArrangement;
  readonly thirdHarmonicPercent: number | null;
  readonly voltageDropLimitPercent: number | null;
  readonly systemType: CableVoltageDropSystemType;
  readonly lengthM: number | null;
  readonly baseVoltageV: number | null;
  readonly cosPhi: number | null;
  readonly detailed: CableSelectDetailedState;
  readonly result: CableSelectResponse | null;
}

function createDefaultCableSelectPageState(): CableSelectPageState {
  return {
    designCurrentA: null,
    phase: "3",
    conductorMaterial: "copper",
    insulation: "XLPE/EPR",
    installationMethod: "B2",
    ambientTemperatureC: null,
    groupedCircuits: null,
    groupingArrangement: "bunched",
    thirdHarmonicPercent: null,
    voltageDropLimitPercent: null,
    systemType: "three-phase-ac-ll",
    lengthM: null,
    baseVoltageV: null,
    cosPhi: null,
    detailed: {
      earthingSystem: "TN",
      circuitRole: "final",
      breakerCurve: "C",
      peLocation: "in-cable",
      conductorArrangement: "multicore",
      parallelConductors: null,
      soilThermalResistivityKmPerW: null,
      burialDepthM: null,
      prospectiveFaultKa: null,
      clearingTimeS: null,
      loopImpedanceMethod: "estimated",
      prospectiveEarthFaultKa: null,
      sourceImpedanceOhm: null,
    },
    result: null,
  };
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

interface CableSelectSubmission {
  request: CableSelectRequest;
  assumptions: AssumptionEntry[];
}

function buildDetailedOptions(
  detailed: CableSelectDetailedState,
  installationMethod: CableMethodCode,
): CableDetailedOptions | null {
  let loopImpedance: CableDetailedOptions["loopImpedance"];
  if (detailed.loopImpedanceMethod === "estimated") {
    loopImpedance = { method: "estimated" };
  } else if (detailed.loopImpedanceMethod === "calculated") {
    const value = detailed.prospectiveEarthFaultKa;
    if (value === null || !isPositiveNumber(value)) return null;
    loopImpedance = { method: "calculated", prospectiveEarthFaultKa: value };
  } else {
    const value = detailed.sourceImpedanceOhm;
    if (value === null || !isPositiveNumber(value)) return null;
    loopImpedance = { method: "measured", sourceImpedanceOhm: value };
  }

  const scA = detailed.prospectiveFaultKa;
  const scB = detailed.clearingTimeS;
  if ((scA === null) !== (scB === null)) return null; // both or neither
  if (scA !== null && scB !== null && (!isPositiveNumber(scA) || !isPositiveNumber(scB))) return null;

  if (detailed.parallelConductors !== null && !isPositiveInteger(detailed.parallelConductors)) {
    return null;
  }

  const isBuried = installationMethod === "D1" || installationMethod === "D2";
  if (
    isBuried &&
    detailed.soilThermalResistivityKmPerW !== null &&
    !isPositiveNumber(detailed.soilThermalResistivityKmPerW)
  ) {
    return null;
  }
  if (isBuried && detailed.burialDepthM !== null && !isPositiveNumber(detailed.burialDepthM)) {
    return null;
  }

  return {
    earthingSystem: detailed.earthingSystem,
    circuitRole: detailed.circuitRole,
    breakerCurve: detailed.breakerCurve,
    peLocation: detailed.peLocation,
    conductorArrangement: detailed.conductorArrangement,
    ...(detailed.parallelConductors !== null
      ? { parallelConductors: detailed.parallelConductors }
      : {}),
    ...(isBuried && detailed.soilThermalResistivityKmPerW !== null
      ? { soilThermalResistivityKmPerW: detailed.soilThermalResistivityKmPerW }
      : {}),
    ...(isBuried && detailed.burialDepthM !== null ? { burialDepthM: detailed.burialDepthM } : {}),
    ...(scA !== null && scB !== null
      ? { shortCircuit: { prospectiveFaultKa: scA, clearingTimeS: scB } }
      : {}),
    loopImpedance,
  };
}

function buildCableSelectSubmission(
  mode: "standard" | "detailed",
  state: CableSelectPageState,
  methods: readonly CableMethodCode[],
): CableSelectSubmission | null {
  const resolvedInstallationMethod = methods.includes(state.installationMethod)
    ? state.installationMethod
    : methods[0];
  if (!resolvedInstallationMethod) return null;

  const designCurrent = normalizeExampleNumber(
    state.designCurrentA,
    CALCULATOR_EXAMPLE_DEFAULTS.cable.designCurrentA,
    "designCurrentA",
  );
  const ambientTemperature = normalizeExampleNumber(
    state.ambientTemperatureC,
    CALCULATOR_EXAMPLE_DEFAULTS.cable.ambientTemperatureC,
    "ambientTemperatureC",
  );
  const groupedCircuits = normalizeExampleNumber(
    state.groupedCircuits,
    CALCULATOR_EXAMPLE_DEFAULTS.cable.groupedCircuits,
    "groupedCircuits",
  );
  const thirdHarmonic = normalizeExampleNumber(
    state.thirdHarmonicPercent,
    CALCULATOR_EXAMPLE_DEFAULTS.cable.thirdHarmonicPercent,
    "thirdHarmonicPercent",
  );
  const voltageDropLimitPercent = normalizeExampleNumber(
    state.voltageDropLimitPercent,
    CALCULATOR_EXAMPLE_DEFAULTS.cable.voltageDropLimitPercent,
    "voltageDropLimitPercent",
  );
  const lengthM = normalizeExampleNumber(
    state.lengthM,
    CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.lengthM,
    "lengthM",
  );
  const baseVoltageV = normalizeExampleNumber(
    state.baseVoltageV,
    CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.baseVoltageV,
    "baseVoltageV",
  );
  const cosPhi = normalizeExampleNumber(
    state.cosPhi,
    CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.cosPhi,
    "cosPhi",
  );

  if (
    !isPositiveNumber(designCurrent.value) ||
    !isPositiveNumber(ambientTemperature.value) ||
    !isPositiveInteger(groupedCircuits.value) ||
    thirdHarmonic.value < 0 ||
    !isPositiveNumber(voltageDropLimitPercent.value) ||
    !isPositiveNumber(lengthM.value) ||
    !isPositiveNumber(baseVoltageV.value) ||
    cosPhi.value <= 0 ||
    cosPhi.value > 1
  ) {
    return null;
  }

  let detailedOptions: CableDetailedOptions | undefined;
  if (mode === "detailed") {
    const built = buildDetailedOptions(state.detailed, resolvedInstallationMethod);
    if (!built) return null;
    detailedOptions = built;
  }

  const assumptions = mergeAssumptions(
    designCurrent.assumptions,
    ambientTemperature.assumptions,
    groupedCircuits.assumptions,
    thirdHarmonic.assumptions,
    voltageDropLimitPercent.assumptions,
    lengthM.assumptions,
    baseVoltageV.assumptions,
    cosPhi.assumptions,
  );

  const request: CableSelectRequest = {
    mode,
    designCurrentA: designCurrent.value,
    phase: Number(state.phase) as 1 | 3,
    circuitKind: "power",
    conductorMaterial: state.conductorMaterial,
    insulation: state.insulation,
    installationMethod: resolvedInstallationMethod,
    ambientTemperatureC: ambientTemperature.value,
    groupedCircuits: groupedCircuits.value,
    groupingArrangement: state.groupingArrangement,
    thirdHarmonicPercent: thirdHarmonic.value,
    voltageDropLimitPercent: voltageDropLimitPercent.value,
    voltageDrop: {
      systemType: state.systemType,
      lengthM: lengthM.value,
      baseVoltageV: baseVoltageV.value,
      cosPhi: cosPhi.value,
    },
    ...(detailedOptions ? { detailed: detailedOptions } : {}),
  };

  return { request, assumptions };
}

interface CableSelectModeProps {
  mode: "standard" | "detailed";
}

export function CableSelectMode({ mode }: CableSelectModeProps) {
  const [pageState, setPageState] = usePersistentPageState<CableSelectPageState>({
    key: `elektroplan.page.cable.select.${mode}`,
    version: 1,
    defaultValue: () => createDefaultCableSelectPageState(),
  });
  const { phase, systemType, installationMethod, detailed, result } = pageState;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const methodsQuery = useQuery({
    queryKey: queryKeys.installationMethods,
    queryFn: () => getBridge().data.installationMethods(),
    enabled: isBridgeAvailable(),
  });

  const methods = resolveMethods(methodsQuery.data);
  const methodOptions = methods.map((method) => ({
    value: method,
    label: `${method} - ${CABLE_METHOD_DESCRIPTIONS[method]}`,
  }));

  const systemTypeOptions =
    phase === "1"
      ? SYSTEM_TYPE_OPTIONS.filter((opt) => opt.value === "single-phase-ac-two-conductor")
      : SYSTEM_TYPE_OPTIONS.filter((opt) => opt.value !== "single-phase-ac-two-conductor");

  const isBuriedMethod = installationMethod === "D1" || installationMethod === "D2";

  const submission = buildCableSelectSubmission(mode, pageState, methods);
  const idPrefix = `cable-select-${mode}`;

  function updateDetailed(patch: Partial<CableSelectDetailedState>) {
    setPageState((current) => ({ ...current, detailed: { ...current.detailed, ...patch } }));
  }

  async function handleSubmit() {
    if (!submission) return;

    const requestId = ++requestSeq.current;
    setLoading(true);
    setError(null);

    try {
      const response = await getBridge().calc.cableSelect(submission.request);
      if (requestSeq.current !== requestId) return;
      const merged: CableSelectResponse = {
        ...response,
        assumptions: mergeAssumptions(response.assumptions, submission.assumptions),
      };
      setPageState((current) => ({ ...current, result: merged }));
    } catch (caughtError) {
      if (requestSeq.current !== requestId) return;
      setError(caughtError instanceof Error ? caughtError.message : "Hesaplama hatası.");
    } finally {
      if (requestSeq.current === requestId) {
        setLoading(false);
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <Card title={mode === "detailed" ? "Detaylı Hesap Parametreleri" : "Hesap Parametreleri"}>
        <div className={styles.form}>
          <div className={fieldGrid}>
            <Field label="Tasarım Akımı (A)" htmlFor={`${idPrefix}-designCurrentA`} required>
              <NumberInput
                id={`${idPrefix}-designCurrentA`}
                value={pageState.designCurrentA}
                onChange={(next) => setPageState((current) => ({ ...current, designCurrentA: next }))}
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.cable.designCurrentA)}
              />
            </Field>
            <Field label="Faz" htmlFor={`${idPrefix}-phase`}>
              <Select
                id={`${idPrefix}-phase`}
                value={phase}
                onChange={(value) => {
                  const nextPhase = value as "1" | "3";
                  setPageState((current) => ({
                    ...current,
                    phase: nextPhase,
                    systemType:
                      nextPhase === "1"
                        ? "single-phase-ac-two-conductor"
                        : current.systemType === "single-phase-ac-two-conductor"
                          ? "three-phase-ac-ll"
                          : current.systemType,
                  }));
                }}
                options={PHASE_OPTIONS}
              />
            </Field>
            <Field label="İletken Malzeme" htmlFor={`${idPrefix}-material`}>
              <Select
                id={`${idPrefix}-material`}
                value={pageState.conductorMaterial}
                onChange={(value) =>
                  setPageState((current) => ({
                    ...current,
                    conductorMaterial: value as "copper" | "aluminum",
                  }))
                }
                options={MATERIAL_OPTIONS}
              />
            </Field>
            <Field label="Yalıtım" htmlFor={`${idPrefix}-insulation`}>
              <Select
                id={`${idPrefix}-insulation`}
                value={pageState.insulation}
                onChange={(value) =>
                  setPageState((current) => ({ ...current, insulation: value as "PVC" | "XLPE/EPR" }))
                }
                options={INSULATION_OPTIONS}
              />
            </Field>
            <Field label="Montaj Yöntemi" htmlFor={`${idPrefix}-method`}>
              <Select
                id={`${idPrefix}-method`}
                value={installationMethod}
                onChange={(value) =>
                  setPageState((current) => ({
                    ...current,
                    installationMethod: value as CableMethodCode,
                  }))
                }
                options={methodOptions}
              />
            </Field>
            <Field label="Gruplama Düzeni" htmlFor={`${idPrefix}-grouping-arrangement`}>
              <Select
                id={`${idPrefix}-grouping-arrangement`}
                value={pageState.groupingArrangement}
                onChange={(value) =>
                  setPageState((current) => ({
                    ...current,
                    groupingArrangement: value as GroupingArrangement,
                  }))
                }
                options={GROUPING_ARRANGEMENT_OPTIONS}
              />
            </Field>
            <Field label="Ortam Sıcaklığı (°C)" htmlFor={`${idPrefix}-ambient`} required>
              <NumberInput
                id={`${idPrefix}-ambient`}
                value={pageState.ambientTemperatureC}
                onChange={(next) =>
                  setPageState((current) => ({ ...current, ambientTemperatureC: next }))
                }
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.cable.ambientTemperatureC)}
              />
            </Field>
            <Field label="Devre Gruplandırma" htmlFor={`${idPrefix}-grouped-circuits`} required>
              <NumberInput
                id={`${idPrefix}-grouped-circuits`}
                value={pageState.groupedCircuits}
                onChange={(next) => setPageState((current) => ({ ...current, groupedCircuits: next }))}
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.cable.groupedCircuits)}
              />
            </Field>
            <Field label="3. Harmonik (%)" htmlFor={`${idPrefix}-harmonic`} required>
              <NumberInput
                id={`${idPrefix}-harmonic`}
                value={pageState.thirdHarmonicPercent}
                onChange={(next) =>
                  setPageState((current) => ({ ...current, thirdHarmonicPercent: next }))
                }
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.cable.thirdHarmonicPercent)}
              />
            </Field>
            <Field label="ΔU Limiti (%)" htmlFor={`${idPrefix}-vd-limit`} required>
              <NumberInput
                id={`${idPrefix}-vd-limit`}
                value={pageState.voltageDropLimitPercent}
                onChange={(next) =>
                  setPageState((current) => ({ ...current, voltageDropLimitPercent: next }))
                }
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.cable.voltageDropLimitPercent)}
              />
            </Field>
            <Field label="Sistem Tipi" htmlFor={`${idPrefix}-system-type`}>
              <Select
                id={`${idPrefix}-system-type`}
                value={systemType}
                onChange={(value) =>
                  setPageState((current) => ({
                    ...current,
                    systemType: value as CableVoltageDropSystemType,
                  }))
                }
                options={systemTypeOptions}
              />
            </Field>
            <Field label="Uzunluk (m)" htmlFor={`${idPrefix}-length`} required>
              <NumberInput
                id={`${idPrefix}-length`}
                value={pageState.lengthM}
                onChange={(next) => setPageState((current) => ({ ...current, lengthM: next }))}
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.lengthM)}
              />
            </Field>
            <Field label="Nominal Gerilim (V)" htmlFor={`${idPrefix}-voltage`} required>
              <NumberInput
                id={`${idPrefix}-voltage`}
                value={pageState.baseVoltageV}
                onChange={(next) => setPageState((current) => ({ ...current, baseVoltageV: next }))}
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.baseVoltageV)}
              />
            </Field>
            <Field label="cosφ" htmlFor={`${idPrefix}-cosphi`}>
              <NumberInput
                id={`${idPrefix}-cosphi`}
                value={pageState.cosPhi}
                onChange={(next) => setPageState((current) => ({ ...current, cosPhi: next }))}
                placeholder={examplePlaceholder(CALCULATOR_EXAMPLE_DEFAULTS.voltageDrop.cosPhi)}
              />
            </Field>
          </div>

          {mode === "detailed" && (
            <Card
              title="Gelişmiş Ayarlar"
              subtitle="Uzman ayarları — sadece detaylı modda değerlendirilir"
              className={styles.advancedCard!}
            >
              <div className={fieldGrid}>
                <Field label="Topraklama Sistemi" htmlFor={`${idPrefix}-earthing`}>
                  <Select
                    id={`${idPrefix}-earthing`}
                    value={detailed.earthingSystem}
                    onChange={(value) => updateDetailed({ earthingSystem: value as "TN" | "TT" })}
                    options={EARTHING_OPTIONS}
                  />
                </Field>
                <Field label="Devre Rolü" htmlFor={`${idPrefix}-circuit-role`}>
                  <Select
                    id={`${idPrefix}-circuit-role`}
                    value={detailed.circuitRole}
                    onChange={(value) =>
                      updateDetailed({ circuitRole: value as "final" | "distribution" })
                    }
                    options={CIRCUIT_ROLE_OPTIONS}
                  />
                </Field>
                <Field label="Kesici Eğrisi" htmlFor={`${idPrefix}-breaker-curve`}>
                  <Select
                    id={`${idPrefix}-breaker-curve`}
                    value={detailed.breakerCurve}
                    onChange={(value) => updateDetailed({ breakerCurve: value as "B" | "C" | "D" })}
                    options={BREAKER_CURVE_OPTIONS}
                  />
                </Field>
                <Field label="PE Konumu" htmlFor={`${idPrefix}-pe-location`}>
                  <Select
                    id={`${idPrefix}-pe-location`}
                    value={detailed.peLocation}
                    onChange={(value) =>
                      updateDetailed({ peLocation: value as "in-cable" | "separate" })
                    }
                    options={PE_LOCATION_OPTIONS}
                  />
                </Field>
                <Field label="İletken Dizilimi" htmlFor={`${idPrefix}-conductor-arrangement`}>
                  <Select
                    id={`${idPrefix}-conductor-arrangement`}
                    value={detailed.conductorArrangement}
                    onChange={(value) =>
                      updateDetailed({ conductorArrangement: value as ConductorArrangement })
                    }
                    options={CONDUCTOR_ARRANGEMENT_OPTIONS}
                  />
                </Field>
                <Field
                  label="Paralel İletken (isteğe bağlı)"
                  htmlFor={`${idPrefix}-parallel-conductors`}
                >
                  <NumberInput
                    id={`${idPrefix}-parallel-conductors`}
                    value={detailed.parallelConductors}
                    onChange={(next) => updateDetailed({ parallelConductors: next })}
                  />
                </Field>
                {isBuriedMethod && (
                  <>
                    <Field
                      label="Toprak Termal Direnci (K·m/W)"
                      htmlFor={`${idPrefix}-soil-resistivity`}
                    >
                      <NumberInput
                        id={`${idPrefix}-soil-resistivity`}
                        value={detailed.soilThermalResistivityKmPerW}
                        onChange={(next) => updateDetailed({ soilThermalResistivityKmPerW: next })}
                      />
                    </Field>
                    <Field label="Gömme Derinliği (m)" htmlFor={`${idPrefix}-burial-depth`}>
                      <NumberInput
                        id={`${idPrefix}-burial-depth`}
                        value={detailed.burialDepthM}
                        onChange={(next) => updateDetailed({ burialDepthM: next })}
                      />
                    </Field>
                  </>
                )}
                <Field
                  label="Öngörülen Kısa Devre Akımı (kA, isteğe bağlı)"
                  htmlFor={`${idPrefix}-isc`}
                >
                  <NumberInput
                    id={`${idPrefix}-isc`}
                    value={detailed.prospectiveFaultKa}
                    onChange={(next) => updateDetailed({ prospectiveFaultKa: next })}
                  />
                </Field>
                <Field label="Açma Süresi (s, isteğe bağlı)" htmlFor={`${idPrefix}-clearing-time`}>
                  <NumberInput
                    id={`${idPrefix}-clearing-time`}
                    value={detailed.clearingTimeS}
                    onChange={(next) => updateDetailed({ clearingTimeS: next })}
                  />
                </Field>
                <Field label="Toprak Döngü Empedansı Yöntemi" htmlFor={`${idPrefix}-loop-method`}>
                  <Select
                    id={`${idPrefix}-loop-method`}
                    value={detailed.loopImpedanceMethod}
                    onChange={(value) =>
                      updateDetailed({
                        loopImpedanceMethod: value as "estimated" | "calculated" | "measured",
                      })
                    }
                    options={LOOP_IMPEDANCE_METHOD_OPTIONS}
                  />
                </Field>
                {detailed.loopImpedanceMethod === "calculated" && (
                  <Field
                    label="Öngörülen Toprak Kısa Devre Akımı (kA)"
                    htmlFor={`${idPrefix}-earth-fault-ka`}
                    required
                  >
                    <NumberInput
                      id={`${idPrefix}-earth-fault-ka`}
                      value={detailed.prospectiveEarthFaultKa}
                      onChange={(next) => updateDetailed({ prospectiveEarthFaultKa: next })}
                    />
                  </Field>
                )}
                {detailed.loopImpedanceMethod === "measured" && (
                  <Field
                    label="Ölçülen Kaynak Empedansı (Ω)"
                    htmlFor={`${idPrefix}-source-impedance`}
                    required
                  >
                    <NumberInput
                      id={`${idPrefix}-source-impedance`}
                      value={detailed.sourceImpedanceOhm}
                      onChange={(next) => updateDetailed({ sourceImpedanceOhm: next })}
                    />
                  </Field>
                )}
              </div>
            </Card>
          )}

          <div className={styles.actions}>
            <Button type="button" variant="primary" disabled={!submission} loading={loading} onClick={handleSubmit}>
              Hesapla
            </Button>
          </div>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      {result && (
        <ResultPanel
          title="Kablo Seçim Sonucu"
          warnings={[...result.warnings]}
          assumptions={[...result.assumptions]}
          engineVersion={result.engineVersion}
          dataVersion={result.dataVersion}
        >
          <div className={resultGrid}>
            <ResultRow
              label="Seçilen Kesit"
              value={`${formatNumberTr(result.value.selectedSectionMm2, 0)} mm²`}
              highlight
            />
            <ResultRow label="Iz Gereken" value={formatAmp(result.value.izRequiredA, 2)} />
            <ResultRow label="Boyutlandırma Akımı" value={formatAmp(result.value.sizingCurrentA, 2)} />
            <ResultRow label="kT (Sıcaklık)" value={formatNumberTr(result.value.kT, 4)} />
            <ResultRow label="kG (Gruplama)" value={formatNumberTr(result.value.kG, 4)} />
            <ResultRow label="kH (Harmonik)" value={formatNumberTr(result.value.kH, 4)} />
            <ResultRow label="kS (Kısa Devre)" value={formatNumberTr(result.value.kS, 4)} />
            <ResultRow label="kD (Derinlik)" value={formatNumberTr(result.value.kD, 4)} />
            <ResultRow label="kTotal" value={formatNumberTr(result.value.kTotal, 4)} />
            <ResultRow
              label="Gerilim Düşümü ΔV%"
              value={formatPercent(result.value.vdResult?.value?.deltaVPercent, 2)}
            />
            {mode === "detailed" && (
              <>
                <ResultRow
                  label="Seçilen Cihaz"
                  value={
                    result.value.selectedDevice
                      ? `${result.value.selectedDevice.family} ${formatAmp(result.value.selectedDevice.nominalCurrentA, 0)} (${result.value.selectedDevice.curve ?? "—"})`
                      : "—"
                  }
                />
                <ResultRow
                  label="PE Kesiti"
                  value={
                    result.value.peSectionMm2 !== null
                      ? `${formatNumberTr(result.value.peSectionMm2, 0)} mm²`
                      : "—"
                  }
                />
                <ResultRow
                  label="Nötr Kesiti"
                  value={
                    result.value.neutralSectionMm2 !== null
                      ? `${formatNumberTr(result.value.neutralSectionMm2, 0)} mm²`
                      : "—"
                  }
                />
              </>
            )}
          </div>

          {/* Task 6: <CriterionTrace trace={result.value.candidateTrace} /> renders here. */}
        </ResultPanel>
      )}
    </div>
  );
}
