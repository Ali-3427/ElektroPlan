import { useQuery } from "@tanstack/react-query";
import { getBridge, isBridgeAvailable } from "../../bridge/client";
import { queryKeys } from "../../query/keys";

export function useRecordAssignments(recordIds: readonly string[]) {
  const sorted = [...recordIds].sort();
  return useQuery({
    queryKey: queryKeys.assignmentsForRecords(sorted),
    queryFn: () =>
      recordIds.length
        ? getBridge().assignments.listForRecords([...recordIds])
        : Promise.resolve([]),
    enabled: isBridgeAvailable() && recordIds.length > 0,
  });
}
