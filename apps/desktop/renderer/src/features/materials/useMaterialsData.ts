import { useQuery } from "@tanstack/react-query";
import { getBridge, isBridgeAvailable } from "../../bridge/client";
import { queryKeys } from "../../query/keys";

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.materialCategories,
    queryFn: () => getBridge().materials.listCategories(),
    enabled: isBridgeAvailable(),
  });
}

export function useMaterials(filter: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.materialsList(filter),
    queryFn: () => getBridge().materials.list(filter),
    enabled: isBridgeAvailable(),
  });
}
