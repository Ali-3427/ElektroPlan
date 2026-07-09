import { useQuery } from "@tanstack/react-query";
import { getBridge } from "../../bridge/client";
import { queryKeys } from "../../query/keys";

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.materialCategories,
    queryFn: () => getBridge().materials.listCategories(),
  });
}

export function useMaterials(filter: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.materialsList(filter),
    queryFn: () => getBridge().materials.list(filter),
  });
}
