"use client";

import { useState, useMemo } from "react";
import type { ProviderData, ModelInfo } from "@/lib/data";
import {
  groupRegions,
  getDefaultRegion,
  isContinent,
  regionsForContinent,
  CONTINENT_PREFIX,
} from "@/lib/regions";
import { getModelFamily, sortFamilies } from "@/lib/families";
import { getModelUrl } from "@/lib/model-urls";

interface Props {
  providers: Record<string, ProviderData | null>;
}

interface FamilyGroup {
  family: string;
  models: ModelInfo[];
}

export default function Dashboard({ providers }: Props) {
  const providerKeys = Object.keys(providers).filter(
    (k) => providers[k] !== null,
  );

  const [provider, setProvider] = useState(providerKeys[0] ?? "azure");
  const [region, setRegion] = useState(getDefaultRegion(provider));
  const [search, setSearch] = useState("");
  const [selectedDtypes, setSelectedDtypes] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [showModelTags, setShowModelTags] = useState(true);

  const data = providers[provider];

  /* ---- derived: all region names for current provider ---- */
  const allRegions = useMemo(() => {
    if (!data) return [];
    const first = data.models[0];
    return first ? first.regions.map((r) => r.region) : [];
  }, [data]);

  /* ---- derived: grouped regions (Europe first) ---- */
  const grouped = useMemo(
    () => groupRegions(allRegions, provider),
    [allRegions, provider],
  );

  /* ---- derived: is continent selected & which regions it covers ---- */
  const isContinentSelected = isContinent(region);
  const continentRegionNames = useMemo(() => {
    if (!isContinentSelected) return [];
    return regionsForContinent(region, allRegions, provider);
  }, [isContinentSelected, region, allRegions, provider]);

  /* ---- derived: all deployment types and sources for the current provider ---- */
  const { availableDtypes, availableSources, azureSourceTags, allUniqueTags } = useMemo(() => {
    if (!data) return { availableDtypes: [], availableSources: [], azureSourceTags: [], allUniqueTags: [] };
    const dtypeSet = new Set<string>();
    const sourceSet = new Set<string>();
    for (const model of data.models) {
      if (model.source) sourceSet.add(model.source);
      
      if (viewMode === "single" && !isContinentSelected) {
        // In single-region mode, only collect deployment types for the selected region
        const regionEntry = model.regions.find((r) => r.region === region);
        if (regionEntry?.available) {
          for (const dt of regionEntry.deploymentTypes ?? []) {
            dtypeSet.add(dt);
          }
        }
      } else if (viewMode === "single" && isContinentSelected) {
        // Continent mode: collect deployment types from all regions in the continent
        for (const regionEntry of model.regions) {
          if (continentRegionNames.includes(regionEntry.region) && regionEntry.available) {
            for (const dt of regionEntry.deploymentTypes ?? []) {
              dtypeSet.add(dt);
            }
          }
        }
      } else {
        // In all-regions mode, collect from all regions
        for (const regionEntry of model.regions) {
          for (const dt of regionEntry.deploymentTypes ?? []) {
            dtypeSet.add(dt);
          }
        }
      }
    }
    
    // For Azure, separate source-level tags from deployment types
    const sources = Array.from(sourceSet).sort();
    const dtypes = Array.from(dtypeSet).sort();
    const azureSources = provider === "azure" ? sources : [];
    
    // Create a combined unique list (remove duplicates that appear in both sources and dtypes)
    // Also exclude "Azure Databricks" tag which is a provider name, not a filter
    const allTags = new Set([...sources, ...dtypes]);
    allTags.delete('Azure Databricks'); // Remove provider name tag
    const uniqueTags = Array.from(allTags).sort();
    
    return {
      availableDtypes: dtypes,
      availableSources: sources,
      azureSourceTags: azureSources,
      allUniqueTags: uniqueTags,
    };
  }, [data, provider, viewMode, region, isContinentSelected, continentRegionNames]);

  /* ---- derived: available models grouped by family ---- */
  const { familyGroups, availableCount, totalModels } = useMemo(() => {
    if (!data) return { familyGroups: [] as FamilyGroup[], availableCount: 0, totalModels: 0 };

    const lowerSearch = search.toLowerCase();

    /**
     * Helper: does a model pass the tag filter for a given set of region entries?
     * Returns true if every selected tag is satisfied by the model source or by
     * at least one of the provided (available) region entries' deploymentTypes.
     */
    function passesTagFilter(model: ModelInfo, regionEntries: { deploymentTypes: string[] }[]): boolean {
      if (selectedDtypes.length === 0) return true;
      // Collect the union of deployment types across the provided regions
      const dtypeUnion = new Set<string>();
      for (const re of regionEntries) {
        for (const dt of re.deploymentTypes ?? []) dtypeUnion.add(dt);
      }
      return selectedDtypes.every((tag: string) => model.source === tag || dtypeUnion.has(tag));
    }

    // Filter models based on view mode
    const filteredModels: ModelInfo[] = [];
    for (const model of data.models) {
      if (viewMode === "single" && !isContinentSelected) {
        // Single region mode: only show models available in the selected region
        const regionEntry = model.regions.find((r) => r.region === region);
        if (!regionEntry?.available) continue;
        if (!passesTagFilter(model, [regionEntry])) continue;
      } else if (viewMode === "single" && isContinentSelected) {
        // Continent mode: show models available in ANY region of the continent
        const matchingRegions = model.regions.filter(
          (r) => continentRegionNames.includes(r.region) && r.available,
        );
        if (matchingRegions.length === 0) continue;
        if (!passesTagFilter(model, matchingRegions)) continue;
      } else {
        // All regions mode: model must have tags satisfied in at least one available region
        const availableRegions = model.regions.filter((r) => r.available);
        if (availableRegions.length === 0) continue;
        if (!passesTagFilter(model, availableRegions)) continue;
      }
      
      if (lowerSearch !== "" && !model.name.toLowerCase().includes(lowerSearch)) continue;
      filteredModels.push(model);
    }

    // Group filtered models by family (only show families that have models)
    const familyMap = new Map<string, ModelInfo[]>();
    for (const model of filteredModels) {
      const family = getModelFamily(model.name);
      const list = familyMap.get(family);
      if (list) {
        list.push(model);
      } else {
        familyMap.set(family, [model]);
      }
    }

    // Sort families in preferred order
    const sortedKeys = sortFamilies(Array.from(familyMap.keys()));
    const groups: FamilyGroup[] = sortedKeys.map((family) => ({
      family,
      models: familyMap.get(family)!,
    }));

    // Count models available (for stats bar) — same logic, minus text search
    let filteredAvailable = 0;
    for (const model of data.models) {
      if (viewMode === "single" && !isContinentSelected) {
        const regionEntry = model.regions.find((r) => r.region === region);
        if (!regionEntry?.available) continue;
        if (!passesTagFilter(model, [regionEntry])) continue;
      } else if (viewMode === "single" && isContinentSelected) {
        const matchingRegions = model.regions.filter(
          (r) => continentRegionNames.includes(r.region) && r.available,
        );
        if (matchingRegions.length === 0) continue;
        if (!passesTagFilter(model, matchingRegions)) continue;
      } else {
        const availableRegions = model.regions.filter((r) => r.available);
        if (availableRegions.length === 0) continue;
        if (!passesTagFilter(model, availableRegions)) continue;
      }
      filteredAvailable++;
    }

    return {
      familyGroups: groups,
      availableCount: filteredAvailable,
      totalModels: data.models.length,
    };
  }, [data, region, search, selectedDtypes, viewMode, isContinentSelected, continentRegionNames]);

  /* ---- handler: switch provider ---- */
  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    setRegion(getDefaultRegion(newProvider));
    setSearch("");
    setSelectedDtypes([]);
    setCollapsed({});
  }

  /* ---- handler: toggle filter (works for both sources and deployment types) ---- */
  function toggleFilter(filterValue: string) {
    setSelectedDtypes((prev) => {
      if (prev.includes(filterValue)) {
        return prev.filter((d) => d !== filterValue);
      } else {
        return [...prev, filterValue];
      }
    });
  }

  /* ---- handler: clear all filters ---- */
  function clearAllFilters() {
    setSelectedDtypes([]);
  }

  /* ---- handler: collapse/expand all families ---- */
  function collapseAll() {
    const allCollapsed: Record<string, boolean> = {};
    familyGroups.forEach((group) => {
      allCollapsed[group.family] = true;
    });
    setCollapsed(allCollapsed);
  }

  function expandAll() {
    setCollapsed({});
  }

  /* ---- derived: check if all families are collapsed ---- */
  const allCollapsed = familyGroups.length > 0 && familyGroups.every((group) => collapsed[group.family] ?? false);

  /* ---- handler: toggle family collapse ---- */
  function toggleFamily(family: string) {
    setCollapsed((prev) => ({ ...prev, [family]: !prev[family] }));
  }

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString()
    : "Unknown";

  const displayedCount = familyGroups.reduce((sum, g) => sum + g.models.length, 0);

  return (
    <div id="top" className="min-h-screen bg-gray-950 text-gray-100">
      {/* ---- Header ---- */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">
            <a href="#top" className="hover:text-green-400 transition-colors">
              AI Model&ndash;Region Availability
            </a>
          </h1>

          {/* Last Updated */}
          <div className="flex items-center text-sm text-gray-400">
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* ---- Selectors row ---- */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Provider */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providerKeys.map((k) => (
                <option key={k} value={k}>
                  {providers[k]!.provider}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              View
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as "single" | "all")}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="single">Single Region</option>
              <option value="all">All Regions</option>
            </select>
          </div>

          {/* Region (grouped) - only shown when single region mode is selected */}
          {viewMode === "single" && (
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value); setSelectedDtypes([]); }}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {grouped.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    <option
                      key={`${CONTINENT_PREFIX}${g.group}`}
                      value={`${CONTINENT_PREFIX}${g.group}`}
                    >
                      {`All ${g.group} (${g.regions.length} regions)`}
                    </option>
                    {g.regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ---- Filter pills (sources and deployment types) ---- */}
        <div className="space-y-3">
          {/* Row 1: Source-level filters (for Azure Foundry only) */}
          {provider === "azure" && azureSourceTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedDtypes.length === 0
                    ? "border-green-500 bg-green-900/40 text-green-400"
                    : "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                All
              </button>
              {azureSourceTags.map((source) => {
                const isSelected = selectedDtypes.includes(source);
                return (
                  <button
                    key={source}
                    type="button"
                    onClick={() => toggleFilter(source)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-green-500 bg-green-900/40 text-green-400 ring-2 ring-green-500/30"
                        : "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {source}
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 2: Deployment type filters (for Azure) OR all filters (for other providers) */}
          {(provider === "azure" ? availableDtypes.length > 0 : allUniqueTags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {provider !== "azure" && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedDtypes.length === 0
                      ? "border-green-500 bg-green-900/40 text-green-400"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  All
                </button>
              )}
              
              {/* For non-Azure providers, show all unique tags (sources + dtypes deduplicated) */}
              {provider !== "azure" && allUniqueTags.map((tag) => {
                const isSelected = selectedDtypes.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFilter(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-green-500 bg-green-900/40 text-green-400 ring-2 ring-green-500/30"
                        : "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              
              {/* For Azure, only show deployment types (skip source tags) */}
              {provider === "azure" && availableDtypes.map((dtype) => {
                // Skip source-level filters in this row (they appear in Row 1)
                if (azureSourceTags.includes(dtype)) return null;
                
                const isSelected = selectedDtypes.includes(dtype);
                return (
                  <button
                    key={dtype}
                    type="button"
                    onClick={() => toggleFilter(dtype)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-green-500 bg-green-900/40 text-green-400 ring-2 ring-green-500/30"
                        : "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {dtype}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Stats bar ---- */}
        <div className="flex items-center gap-4 rounded bg-gray-900 border border-gray-800 px-4 py-3 text-sm">
          <span className="text-green-400 font-semibold">
            {availableCount} available
          </span>
          <span className="text-gray-500">
            of {totalModels} models ({totalModels > 0 ? ((availableCount / totalModels) * 100).toFixed(1) : 0}%)
          </span>
          <span className="text-gray-500">
            &middot; {familyGroups.length} families
          </span>
          {viewMode === "single" && !isContinentSelected && (
            <span className="ml-auto text-gray-500">
              {allRegions.length} regions
            </span>
          )}
          {viewMode === "single" && isContinentSelected && (
            <span className="ml-auto text-gray-500">
              {continentRegionNames.length} regions in continent
            </span>
          )}
        </div>

        {/* ---- Search and Collapse/Expand Toggle ---- */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Filter models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 pr-8 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Show/Hide Tags Toggle */}
          <button
            type="button"
            onClick={() => setShowModelTags(!showModelTags)}
            className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span className="text-[10px]">{showModelTags ? "▼" : "▶"}</span>
            <span>Hide/Show tags</span>
          </button>
          
          {familyGroups.length > 0 && (
            <button
              type="button"
              onClick={allCollapsed ? expandAll : collapseAll}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <span className="text-[10px]">
                {allCollapsed ? "▼" : "▲"}
              </span>
              <span>
                {allCollapsed ? "Expand All" : "Collapse All"}
              </span>
            </button>
          )}
        </div>

        {/* ---- Family groups ---- */}
        {familyGroups.length === 0 && (
          <div className="rounded border border-gray-800 px-4 py-8 text-center text-gray-500">
            No available models match your filter.
          </div>
        )}

        {familyGroups.map((group) => {
          const isCollapsed = collapsed[group.family] ?? false;

          return (
            <div
              key={group.family}
              className="rounded border border-gray-800 overflow-hidden"
            >
              {/* Family header (clickable) */}
              <button
                type="button"
                onClick={() => toggleFamily(group.family)}
                className="w-full flex items-center justify-between bg-gray-900 px-4 py-3 text-left hover:bg-gray-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-gray-400 text-xs transition-transform duration-150"
                    style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                  >
                    &#9660;
                  </span>
                  <span className="font-medium text-sm">{group.family}</span>
                  <span className="text-xs text-gray-500">
                    {group.models.length} model{group.models.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="inline-block rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                  {group.models.length}
                </span>
              </button>

              {/* Model list */}
              {!isCollapsed && group.models.length > 0 && (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-800">
                    {group.models.map((m, i) => {
                      const url = getModelUrl(m, provider);

                      // Determine rendering mode:
                      // - "multi" when viewing all regions OR a continent
                      // - "single" when viewing one specific region
                      const isMultiRegionView = viewMode === "all" || isContinentSelected;
                      
                      if (isMultiRegionView) {
                        // Multi-region mode: show model name with available regions
                        // Scope to continent regions when a continent is selected
                        const scopedRegions = isContinentSelected
                          ? m.regions.filter((r) => continentRegionNames.includes(r.region))
                          : m.regions;
                        const availableRegionEntries = scopedRegions.filter((r) => r.available);
                        const availableRegionNames = availableRegionEntries.map((r) => r.region);
                        const allDeploymentTypes = Array.from(
                          new Set(availableRegionEntries.flatMap((r) => r.deploymentTypes)),
                        );
                        
                        return (
                          <tr key={`${m.name}-${i}`} className="hover:bg-gray-900/60">
                            <td className="px-4 py-2.5 pl-11">
                              <div className="flex flex-col gap-1">
                                <span>{m.name}</span>
                                {showModelTags && (
                                  <div className="flex flex-wrap gap-1">
                                    {m.source && (
                                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-800/50">
                                        {m.source}
                                      </span>
                                    )}
                                    {allDeploymentTypes.map((dt) => (
                                      <span key={dt} className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-orange-900/30 text-orange-400 border border-orange-800/50">
                                        {dt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {availableRegionNames.map((reg) => (
                                    <span key={reg} className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-400">
                                      {reg}
                                    </span>
                                  ))}
                                  {availableRegionNames.length === 0 && (
                                    <span className="text-xs text-gray-500 italic">No regions available</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 w-28 text-center align-top">
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400 hover:bg-green-800/50 transition-colors"
                                >
                                  Docs&nbsp;&rarr;
                                </a>
                              ) : (
                                <span className="inline-block rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                                  {availableRegionNames.length} region{availableRegionNames.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      } else {
                        // Single region mode: show deployment types for the SELECTED region only
                        const selectedRegionEntry = m.regions.find((r) => r.region === region);
                        const allDeploymentTypes = selectedRegionEntry?.deploymentTypes ?? [];
                        
                        return (
                          <tr key={`${m.name}-${i}`} className="hover:bg-gray-900/60">
                            <td className="px-4 py-2.5 pl-11">
                              <div className="flex flex-col gap-1">
                                <span>{m.name}</span>
                                {showModelTags && (
                                  <div className="flex flex-wrap gap-1">
                                    {m.source && (
                                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-800/50">
                                        {m.source}
                                      </span>
                                    )}
                                    {allDeploymentTypes.map((dt) => (
                                      <span key={dt} className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-orange-900/30 text-orange-400 border border-orange-800/50">
                                        {dt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 w-28 text-center">
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400 hover:bg-green-800/50 transition-colors"
                                >
                                  Docs&nbsp;&rarr;
                                </a>
                              ) : (
                                <span className="inline-block rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">
                                  Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Showing count when search is active */}
        {search && displayedCount > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Showing {displayedCount} available model{displayedCount !== 1 ? "s" : ""} matching &ldquo;{search}&rdquo;
          </p>
        )}
      </main>
    </div>
  );
}
