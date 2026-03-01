"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type L from "leaflet";

const STEP_DIST_M = 25;
const DEG_PER_M_LAT = 1 / 111320;
const degPerMLng = (lat: number) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));
const REVEAL_RADIUS_M = 55; // large enough to clear blocks on both sides of the street, not just the path
const FOG_COLOR = "rgba(30, 25, 40, 0.92)";
const STORAGE_KEY = "walkmap-state";
const AVATAR_KEY = "walkmap-avatar";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const OSRM_NEAREST = "https://router.project-osrm.org/nearest/v1/foot";
const ACHIEVEMENTS_KEY = "walkmap-achievements";
const DAYS_KEY = "walkmap-days";
const WEEKLY_KEY = "walkmap-weekly";
const EXPLORE_HIT_RADIUS_M = 30;

interface Zone {
  id: string;
  name: string;
  emoji: string;
  south: number;
  north: number;
  west: number;
  east: number;
  gridSpacing: number;
  requiredPct: number;
}

const ZONES: Zone[] = [
  {
    id: "stevens",
    name: "Stevens Institute of Technology",
    emoji: "\u{1F393}",
    south: 40.7430, north: 40.7468,
    west: -74.0265, east: -74.0225,
    gridSpacing: 20,
    requiredPct: 0.6,
  },
  {
    id: "sinatra-park",
    name: "Sinatra Park",
    emoji: "\u{1F3B5}",
    south: 40.7365, north: 40.7395,
    west: -74.0245, east: -74.0220,
    gridSpacing: 15,
    requiredPct: 0.5,
  },
  {
    id: "elysian-park",
    name: "Elysian Park",
    emoji: "\u{1F333}",
    south: 40.7490, north: 40.7520,
    west: -74.0255, east: -74.0225,
    gridSpacing: 15,
    requiredPct: 0.5,
  },
  {
    id: "hoboken-waterfront",
    name: "Hoboken Waterfront",
    emoji: "\u{1F30A}",
    south: 40.7350, north: 40.7480,
    west: -74.0250, east: -74.0215,
    gridSpacing: 25,
    requiredPct: 0.5,
  },
  {
    id: "hoboken",
    name: "City of Hoboken",
    emoji: "\u{1F3D9}\uFE0F",
    south: 40.7340, north: 40.7530,
    west: -74.0380, east: -74.0195,
    gridSpacing: 40,
    requiredPct: 0.4,
  },
];

function buildZoneCheckpoints(zone: Zone): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = [];
  const dLat = zone.gridSpacing * DEG_PER_M_LAT;
  const dLng = zone.gridSpacing * degPerMLng((zone.south + zone.north) / 2);
  for (let lat = zone.south; lat <= zone.north; lat += dLat) {
    for (let lng = zone.west; lng <= zone.east; lng += dLng) {
      pts.push({ lat, lng });
    }
  }
  return pts;
}

const MIN_EXPLORED_DIST_M = 15;

/**
 * Demo-only fill: add a full grid of points inside the zone so fog clears everywhere.
 * We do NOT skip points (no "too close" check) so the zone always fills completely;
 * grid step is smaller than reveal radius so circles overlap and cover the whole area.
 */
const DEMO_FILL_GRID_M = 8; // step smaller than REVEAL_RADIUS_M (20) so no gaps

function fillZoneForDemo(
  zone: Zone,
  explored: { lat: number; lng: number }[]
): number {
  const added: { lat: number; lng: number }[] = [];
  const midLat = (zone.south + zone.north) / 2;
  const dLat = DEMO_FILL_GRID_M * DEG_PER_M_LAT;
  const dLng = DEMO_FILL_GRID_M * degPerMLng(midLat);

  for (let lat = zone.south; lat <= zone.north; lat += dLat) {
    for (let lng = zone.west; lng <= zone.east; lng += dLng) {
      added.push({ lat, lng });
    }
  }

  explored.push(...added);
  return added.length;
}

function playAchievementSound() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

function loadAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveAchievements(set: Set<string>) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...set])); } catch {}
}

function trackActiveDay() {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    const days: string[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().slice(0, 10);
    if (!days.includes(today)) {
      days.push(today);
      localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    }
  } catch {}
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function updateWeekly(distAddedMeters: number, newTile: boolean) {
  try {
    const weekStart = getWeekStart();
    const raw = localStorage.getItem(WEEKLY_KEY);
    const stored = raw ? JSON.parse(raw) : null;
    const base =
      stored?.weekStart === weekStart
        ? stored
        : { weekStart, distMeters: 0, tilesFound: 0 };
    base.distMeters += distAddedMeters;
    if (newTile) base.tilesFound += 1;
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(base));
  } catch {}
}

interface SavedState {
  exploredPoints: { lat: number; lng: number }[];
  simPos: { lat: number; lng: number };
  trail: [number, number][];
  steps: number;
  totalDist: number;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded, ignore */ }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number) {
  return m >= 1000 ? (m / 1000).toFixed(2) + "km" : Math.round(m) + "m";
}

function formatCoord(lat: number, lng: number) {
  const la = Math.abs(lat).toFixed(5) + (lat >= 0 ? "\u00B0N" : "\u00B0S");
  const lo = Math.abs(lng).toFixed(5) + (lng >= 0 ? "\u00B0E" : "\u00B0W");
  return `${la}  ${lo}`;
}

export default function WalkMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const positionsRef = useRef<[number, number][]>([]);
  const isFollowingRef = useRef(true);
  const stepsRef = useRef(0);
  const totalDistRef = useRef(0);
  const simPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const exploredPointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const rafRef = useRef<number>(0);
  const movingRef = useRef(false);
  const achievedRef = useRef<Set<string>>(new Set());
  const zoneCheckpointsRef = useRef<Map<string, { lat: number; lng: number }[]>>(new Map());
  const bearingRef = useRef(0);
  const rotateStartRef = useRef<{ angle: number; bearing: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [coordLabel, setCoordLabel] = useState("");
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState("0m");
  const [compassDeg, setCompassDeg] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [tilesExplored, setTilesExplored] = useState(0);
  const [achievement, setAchievement] = useState<{ emoji: string; name: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const achievementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  function metersToPixels(meters: number, lat: number) {
    const map = mapRef.current;
    if (!map) return 60;
    const latlng = { lat, lng: 0 };
    const p1 = map.latLngToContainerPoint(latlng);
    const offsetLat = lat + meters * DEG_PER_M_LAT;
    const p2 = map.latLngToContainerPoint({ lat: offsetLat, lng: 0 });
    return Math.abs(p2.y - p1.y);
  }

  function drawFog() {
    const map = mapRef.current;
    const canvas = fogCanvasRef.current;
    if (!map || !canvas) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = FOG_COLOR;
    ctx.fillRect(0, 0, size.x, size.y);

    ctx.globalCompositeOperation = "destination-out";

    const pts = exploredPointsRef.current;
    if (pts.length === 0) {
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    const centerLat = map.getCenter().lat;
    const R = metersToPixels(REVEAL_RADIUS_M, centerLat);

    if (pts.length >= 2) {
      ctx.lineWidth = R * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      const first = map.latLngToContainerPoint([pts[0].lat, pts[0].lng]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const px = map.latLngToContainerPoint([pts[i].lat, pts[i].lng]);
        ctx.lineTo(px.x, px.y);
      }
      ctx.stroke();
    }

    for (const pt of pts) {
      const px = map.latLngToContainerPoint([pt.lat, pt.lng]);
      const gradient = ctx.createRadialGradient(px.x, px.y, R * 0.6, px.x, px.y, R);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.4, "rgba(0,0,0,0.15)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px.x, px.y, R, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function scheduleRedraw() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawFog);
  }

  function persistState() {
    saveState({
      exploredPoints: exploredPointsRef.current,
      simPos: simPosRef.current ?? { lat: 40.7448, lng: -74.0244 },
      trail: positionsRef.current,
      steps: stepsRef.current,
      totalDist: totalDistRef.current,
    });
  }

  function checkZoneAchievements() {
    const explored = exploredPointsRef.current;

    for (const zone of ZONES) {
      if (achievedRef.current.has(zone.id)) continue;

      let checkpoints = zoneCheckpointsRef.current.get(zone.id);
      if (!checkpoints) {
        checkpoints = buildZoneCheckpoints(zone);
        zoneCheckpointsRef.current.set(zone.id, checkpoints);
      }

      let hits = 0;
      for (const cp of checkpoints) {
        for (const ep of explored) {
          if (haversine(cp.lat, cp.lng, ep.lat, ep.lng) < EXPLORE_HIT_RADIUS_M) {
            hits++;
            break;
          }
        }
      }

      const pct = checkpoints.length > 0 ? hits / checkpoints.length : 0;
      if (pct >= zone.requiredPct) {
        achievedRef.current.add(zone.id);
        saveAchievements(achievedRef.current);
        playAchievementSound();
        setAchievement({ emoji: zone.emoji, name: zone.name });
        if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
        achievementTimerRef.current = setTimeout(() => setAchievement(null), 5000);
      }
    }
  }

  function addExploredPoint(lat: number, lng: number) {
    const minNewDist = 15;
    for (const ep of exploredPointsRef.current) {
      if (haversine(ep.lat, ep.lng, lat, lng) < minNewDist) return;
    }
    exploredPointsRef.current.push({ lat, lng });
    setTilesExplored(exploredPointsRef.current.length);
    persistState();
    scheduleRedraw();
    checkZoneAchievements();
    trackActiveDay();
    updateWeekly(0, true);
  }

  function moveMarkerTo(lat: number, lng: number) {
    const last = lastPosRef.current;

    if (last) {
      const d = haversine(last.lat, last.lng, lat, lng);
      totalDistRef.current += d;
      stepsRef.current += Math.round(d / 0.75);
      setSteps(stepsRef.current);
      setDistance(formatDist(totalDistRef.current));
      updateWeekly(d, false);

      positionsRef.current.push([lat, lng]);
      if (positionsRef.current.length > 500) positionsRef.current.shift();
      trailRef.current?.setLatLngs([...positionsRef.current]);
    } else {
      positionsRef.current.push([lat, lng]);
      trailRef.current?.setLatLngs([...positionsRef.current]);
    }

    lastPosRef.current = { lat, lng };
    markerRef.current?.setLatLng([lat, lng]);

    if (isFollowingRef.current && mapRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.3 });
    }

    addExploredPoint(lat, lng);
    setCoordLabel(formatCoord(lat, lng));
  }

  async function snapToRoad(lat: number, lng: number): Promise<{ lat: number; lng: number }> {
    try {
      const res = await fetch(`${OSRM_NEAREST}/${lng},${lat}?number=1`);
      const data = await res.json();
      if (data.code === "Ok" && data.waypoints?.[0]) {
        const [sLng, sLat] = data.waypoints[0].location;
        return { lat: sLat, lng: sLng };
      }
    } catch {}
    return { lat, lng };
  }

  async function fetchRoute(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number
  ): Promise<[number, number][] | null> {
    try {
      const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;
      const coords: [number, number][] = data.routes[0].geometry.coordinates;
      return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
    } catch {
      return null;
    }
  }

  function moveAlongPoints(points: [number, number][]) {
    let i = 0;
    const body = document.getElementById("wm-avBody");
    if (body) {
      body.classList.add("walking");
      if (!body.classList.contains("has-img")) body.textContent = "\u{1F6B6}";
    }

    function tick() {
      if (i >= points.length) {
        if (body) {
          body.classList.remove("walking");
          if (!body.classList.contains("has-img")) body.textContent = "\u{1F9D1}";
        }
        movingRef.current = false;
        return;
      }
      const [lat, lng] = points[i];
      simPosRef.current = { lat, lng };
      moveMarkerTo(lat, lng);
      i++;
      setTimeout(tick, 60);
    }

    tick();
  }

  async function handleDemoWalk() {
    if (movingRef.current) return;
    movingRef.current = true;

    if (achievedRef.current.has("stevens")) {
      achievedRef.current.delete("stevens");
      saveAchievements(achievedRef.current);
    }

    // Serpentine waypoints — each row sweeps one direction, then hops
    // north and sweeps back. No north-south backtracking.
    const waypoints: [number, number][] = [
      // Row 1 (south): west → east
      [40.7431, -74.0262], [40.7431, -74.0245], [40.7431, -74.0227],
      // Hop north
      [40.7440, -74.0227],
      // Row 2: east → west
      [40.7440, -74.0245], [40.7440, -74.0262],
      // Hop north
      [40.7449, -74.0262],
      // Row 3: west → east
      [40.7449, -74.0245], [40.7449, -74.0227],
      // Hop north
      [40.7458, -74.0227],
      // Row 4: east → west
      [40.7458, -74.0245], [40.7458, -74.0262],
      // Hop north
      [40.7467, -74.0262],
      // Row 5 (north): west → east
      [40.7467, -74.0245], [40.7467, -74.0227],
    ];

    showToast("\u{1F3AC} Building route...");

    const explored = exploredPointsRef.current;
    const isExplored = (lat: number, lng: number) =>
      explored.some((ep) => haversine(ep.lat, ep.lng, lat, lng) < 15);

    const needed = waypoints.filter(([lat, lng]) => !isExplored(lat, lng));
    if (needed.length === 0) {
      // Re-check achievements since we deleted "stevens" at the top
      checkZoneAchievements();
      showToast("\u2705 Campus already fully explored!");
      movingRef.current = false;
      return;
    }

    const cur = simPosRef.current ?? { lat: needed[0][0], lng: needed[0][1] };
    const route0 = await fetchRoute(cur.lat, cur.lng, needed[0][0], needed[0][1]);
    const fullPath: [number, number][] = route0 && route0.length > 1
      ? [...route0]
      : [[cur.lat, cur.lng], needed[0]];

    for (let w = 0; w < needed.length - 1; w++) {
      const [fromLat, fromLng] = needed[w];
      const [toLat, toLng] = needed[w + 1];
      const route = await fetchRoute(fromLat, fromLng, toLat, toLng);
      if (route && route.length > 1) {
        fullPath.push(...route.slice(1));
      } else {
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          fullPath.push([
            fromLat + (toLat - fromLat) * (s / steps),
            fromLng + (toLng - fromLng) * (s / steps),
          ]);
        }
      }
    }

    // --- Visited-cell tracker: skip already-walked areas ---
    const CELL = 0.00012; // ~13 m grid
    const cellKey = (lat: number, lng: number) =>
      `${Math.round(lat / CELL)},${Math.round(lng / CELL)}`;

    const walkedCells = new Set<string>();

    // Pre-seed with points the user already explored
    for (const ep of explored) walkedCells.add(cellKey(ep.lat, ep.lng));

    const startPt = fullPath[0];
    simPosRef.current = { lat: startPt[0], lng: startPt[1] };
    markerRef.current?.setLatLng(startPt);
    lastPosRef.current = { lat: startPt[0], lng: startPt[1] };

    if (mapRef.current) {
      mapRef.current.flyTo([40.7449, -74.0245], 16, { duration: 1 });
    }
    const savedFollow = isFollowingRef.current;
    isFollowingRef.current = false;

    showToast("\u{1F6B6} Walking Stevens campus...");

    let i = 0;
    const body = document.getElementById("wm-avBody");
    if (body) {
      body.classList.add("walking");
      if (!body.classList.contains("has-img")) body.textContent = "\u{1F6B6}";
    }

    function tick() {
      // Fast-forward past cells we already walked
      while (i < fullPath.length) {
        const ck = cellKey(fullPath[i][0], fullPath[i][1]);
        if (!walkedCells.has(ck)) break;
        i++;
      }

      if (i >= fullPath.length) {
        if (body) {
          body.classList.remove("walking");
          if (!body.classList.contains("has-img")) body.textContent = "\u{1F9D1}";
        }
        movingRef.current = false;
        isFollowingRef.current = savedFollow;

        checkZoneAchievements();

        // Demo fill: clear everything inside the zone (boundary = zone); everything in between gets cleared too.
        const stevensZone = ZONES.find((z) => z.id === "stevens");
        if (stevensZone) {
          fillZoneForDemo(stevensZone, exploredPointsRef.current);
          persistState();
          scheduleRedraw();
          setTilesExplored(exploredPointsRef.current.length);
        }
        if (!achievedRef.current.has("stevens")) {
          achievedRef.current.add("stevens");
          saveAchievements(achievedRef.current);
        }
        playAchievementSound();
        setAchievement({ emoji: stevensZone?.emoji ?? "\u{1F393}", name: stevensZone?.name ?? "Stevens Institute of Technology" });
        if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
        achievementTimerRef.current = setTimeout(() => setAchievement(null), 8000);
        showToast("\u{1F389} Congratulations! You've discovered Stevens Institute of Technology!");
        return;
      }

      const [lat, lng] = fullPath[i];
      walkedCells.add(cellKey(lat, lng));
      simPosRef.current = { lat, lng };
      moveMarkerTo(lat, lng);
      i++;
      setTimeout(tick, 60);
    }

    setTimeout(tick, 1200);
  }

  async function handleSimMove(dir: "up" | "down" | "left" | "right") {
    if (movingRef.current) return;
    const prev = simPosRef.current;
    if (!prev) return;

    movingRef.current = true;

    const headings = { up: 0, right: 90, down: 180, left: 270 } as const;
    setCompassDeg(headings[dir]);

    const avDirEl = document.getElementById("wm-avDir");
    if (avDirEl) {
      avDirEl.style.transform = `rotate(${headings[dir]}deg)`;
      avDirEl.classList.add("visible");
    }

    let targetLat = prev.lat;
    let targetLng = prev.lng;
    if (dir === "up") targetLat += STEP_DIST_M * DEG_PER_M_LAT;
    if (dir === "down") targetLat -= STEP_DIST_M * DEG_PER_M_LAT;
    if (dir === "right") targetLng += STEP_DIST_M * degPerMLng(prev.lat);
    if (dir === "left") targetLng -= STEP_DIST_M * degPerMLng(prev.lat);

    const snapped = await snapToRoad(targetLat, targetLng);

    const route = await fetchRoute(prev.lat, prev.lng, snapped.lat, snapped.lng);

    if (route && route.length > 1) {
      const routeDist = route.reduce((sum, [lat, lng], i) => {
        if (i === 0) return 0;
        return sum + haversine(route[i - 1][0], route[i - 1][1], lat, lng);
      }, 0);
      const straightDist = haversine(prev.lat, prev.lng, snapped.lat, snapped.lng);

      if (straightDist > 1 && routeDist > straightDist * 3) {
        const ANIM_STEPS = 8;
        const pts: [number, number][] = [];
        for (let i = 1; i <= ANIM_STEPS; i++) {
          pts.push([
            prev.lat + (snapped.lat - prev.lat) * (i / ANIM_STEPS),
            prev.lng + (snapped.lng - prev.lng) * (i / ANIM_STEPS),
          ]);
        }
        moveAlongPoints(pts);
      } else {
        moveAlongPoints(route.slice(1));
      }
    } else {
      const ANIM_STEPS = 8;
      const pts: [number, number][] = [];
      for (let i = 1; i <= ANIM_STEPS; i++) {
        pts.push([
          prev.lat + (snapped.lat - prev.lat) * (i / ANIM_STEPS),
          prev.lng + (snapped.lng - prev.lng) * (i / ANIM_STEPS),
        ]);
      }
      moveAlongPoints(pts);
    }
  }

  // Auto-start: init map immediately, restore saved state if available
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!mapContainerRef.current || mapRef.current) return;

      const Leaf = (await import("leaflet")).default;
      if (cancelled) return;

      const saved = loadState();
      let startPos = saved?.simPos ?? { lat: 40.7448, lng: -74.0244 };
      if (!saved) {
        startPos = await snapToRoad(startPos.lat, startPos.lng);
      }

      const map = Leaf.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
      }).setView([startPos.lat, startPos.lng], 17);

      Leaf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        tileSize: 256,
      }).addTo(map);

      trailRef.current = Leaf.polyline([], {
        color: "transparent",
        weight: 0,
        interactive: false,
      }).addTo(map);

      let avatarSeed: string | null = null;
      try {
        const raw = localStorage.getItem(AVATAR_KEY);
        if (raw && !raw.startsWith("data:") && !raw.startsWith("blob:")) avatarSeed = raw;
      } catch {}

      const avatarSrc = avatarSeed
        ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=transparent`
        : null;

      const bodyContent = avatarSrc
        ? `<img src="${avatarSrc}" class="wm-av-img" alt="" />`
        : "\u{1F9D1}";

      const avatarHTML = `
        <div class="wm-av-wrap">
          <div class="wm-av-ripple"></div>
          <div class="wm-av-ripple"></div>
          <div class="wm-av-ripple"></div>
          <div class="wm-av-accuracy"></div>
          <div class="wm-av-body ${avatarSrc ? "has-img" : ""}" id="wm-avBody">${bodyContent}</div>
          <div class="wm-av-shadow"></div>
          <div class="wm-av-dir" id="wm-avDir"></div>
        </div>`;

      const avatarIcon = Leaf.divIcon({
        className: "",
        html: avatarHTML,
        iconSize: [72, 72],
        iconAnchor: [36, 36],
      });

      markerRef.current = Leaf.marker([startPos.lat, startPos.lng], { icon: avatarIcon }).addTo(map);

      map.on("dragstart", () => { isFollowingRef.current = false; });
      map.on("move", scheduleRedraw);
      map.on("zoom", scheduleRedraw);
      map.on("resize", scheduleRedraw);

      mapRef.current = map;
      simPosRef.current = startPos;
      lastPosRef.current = startPos;
      achievedRef.current = loadAchievements();

      if (saved) {
        exploredPointsRef.current = saved.exploredPoints;
        positionsRef.current = saved.trail;
        stepsRef.current = saved.steps;
        totalDistRef.current = saved.totalDist;
        setSteps(saved.steps);
        setDistance(formatDist(saved.totalDist));
        setTilesExplored(saved.exploredPoints.length);
        trailRef.current.setLatLngs(saved.trail);
        scheduleRedraw();
        showToast("\u{1F4BE} Progress restored");
      } else {
        positionsRef.current = [[startPos.lat, startPos.lng]];
        trailRef.current.setLatLngs([[startPos.lat, startPos.lng]]);
        addExploredPoint(startPos.lat, startPos.lng);
        showToast("\u{1F3AE} Use arrows to walk around");
      }

      setCoordLabel(formatCoord(startPos.lat, startPos.lng));
      setReady(true);
    }

    boot();

    return () => {
      cancelled = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
      cancelAnimationFrame(rafRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRecenter() {
    isFollowingRef.current = true;
    const last = lastPosRef.current;
    if (last && mapRef.current) {
      mapRef.current.flyTo([last.lat, last.lng], 17, { duration: 0.8 });
    }
  }

  function updateMarkerRotation(deg: number) {
    const el = document.querySelector(".wm-av-wrap") as HTMLElement | null;
    if (el) el.style.transform = `rotate(${deg}deg)`;
  }

  function handleResetNorth() {
    bearingRef.current = 0;
    setBearing(0);
    updateMarkerRotation(0);
  }

  function getTouchAngle(t1: React.Touch, t2: React.Touch) {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const angle = getTouchAngle(e.touches[0], e.touches[1]);
      rotateStartRef.current = { angle, bearing: bearingRef.current };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && rotateStartRef.current) {
      const angle = getTouchAngle(e.touches[0], e.touches[1]);
      const delta = angle - rotateStartRef.current.angle;
      const newBearing = (rotateStartRef.current.bearing - delta + 360) % 360;
      bearingRef.current = newBearing;
      setBearing(newBearing);
      updateMarkerRotation(newBearing);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      rotateStartRef.current = null;
    }
  }

  return (
    <div
      className="wm-root"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="wm-rotatable"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <div ref={mapContainerRef} className="wm-map" />
        <canvas ref={fogCanvasRef} className="wm-fog-canvas" />
      </div>

      {ready && (
        <>
          {/* Top Bar */}
          <div className="wm-top-bar">
            <div className="wm-app-brand">
              <div className="wm-app-name">WalkMap</div>
              <div className="wm-app-sub">{coordLabel}</div>
            </div>
            <div className="wm-live-badge">
              <div className="wm-live-dot" />
              <div className="wm-live-txt">SIM</div>
            </div>
          </div>

          {/* Tiles counter */}
          <div className="wm-tiles-counter">
            <span className="wm-tiles-num">{tilesExplored}</span>
            <span className="wm-tiles-label">explored</span>
          </div>

          {/* Compass */}
          <div className="wm-compass-wrap">
            <button
              className="wm-compass"
              onClick={handleResetNorth}
              title="Reset to north"
              type="button"
            >
              <div
                className="wm-compass-inner"
                style={{ transform: `rotate(${-bearing}deg)` }}
              >
                <div className="wm-compass-n">N</div>
                <div
                  className="wm-compass-needle"
                  style={{ transform: `rotate(${compassDeg}deg)` }}
                />
              </div>
            </button>
          </div>

          {/* Recenter */}
          <button className="wm-recenter-btn" onClick={handleRecenter}>
            {"\u2295"}
          </button>

          {/* Arrow buttons */}
          <div className="wm-arrows">
            <button className="wm-arrow-btn wm-arrow-up" onClick={() => handleSimMove("up")}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
            </button>
            <div className="wm-arrow-mid">
              <button className="wm-arrow-btn" onClick={() => handleSimMove("left")}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l8-8v5h8v6h-8v5z"/></svg>
              </button>
              <button className="wm-arrow-btn" onClick={() => handleSimMove("right")}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 12l-8 8v-5H4v-6h8V4z"/></svg>
              </button>
            </div>
            <button className="wm-arrow-btn wm-arrow-down" onClick={() => handleSimMove("down")}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-5V4h-6v8H4z"/></svg>
            </button>
          </div>

          {/* Demo Walk */}
          <button
            className="wm-demo-btn"
            onClick={handleDemoWalk}
            type="button"
          >
            <span className="wm-demo-icon">{"\u{1F3AC}"}</span>
            Demo Walk
          </button>

          {/* Stats Strip */}
          <div className="wm-stats-strip">
            <div className="wm-stats-row">
              <div className="wm-stat-chip highlight">
                <div className="wm-num">{steps.toLocaleString()}</div>
                <div className="wm-lbl">Steps</div>
              </div>
              <div className="wm-stat-chip">
                <div className="wm-num">{distance}</div>
                <div className="wm-lbl">Distance</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Achievement banner */}
      <div className={`wm-achievement ${achievement ? "show" : ""}`}>
        <div className="wm-achievement-emoji">{achievement?.emoji}</div>
        <div className="wm-achievement-text">
          <div className="wm-achievement-title">Area Discovered!</div>
          <div className="wm-achievement-name">{achievement?.name}</div>
        </div>
      </div>

      <div className={`wm-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
