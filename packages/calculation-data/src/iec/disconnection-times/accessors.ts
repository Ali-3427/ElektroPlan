import { disconnectionTimesDataset } from "./dataset.js";
import type { DisconnectionTimeQuery } from "./types.js";

export function getMaxDisconnectionTime(query: DisconnectionTimeQuery): number | undefined {
  return disconnectionTimesDataset.entries.find(
    (e) =>
      e.system === query.system &&
      e.circuitRole === query.circuitRole &&
      query.u0V > e.u0MinV &&
      (e.u0MaxV === null || query.u0V <= e.u0MaxV),
  )?.maxSeconds;
}
