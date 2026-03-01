"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type L from "leaflet";

const STEP_DIST_M = 25;
const DEG_PER_M_LAT = 1 / 111320;
const degPerMLng = (lat: number) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));
const REVEAL_RADIUS_PX = 60;
const FOG_COLOR = "rgba(30, 25, 40, 0.92)";
const STORAGE_KEY = "walkmap-state";
const AVATAR_KEY = "walkmap-avatar";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const OSRM_NEAREST = "https://router.project-osrm.org/nearest/v1/foot";
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

  const [ready, setReady] = useState(false);
  const [coordLabel, setCoordLabel] = useState("");
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState("0m");
  const [compassDeg, setCompassDeg] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [tilesExplored, setTilesExplored] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

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

    for (const pt of exploredPointsRef.current) {
      const px = map.latLngToContainerPoint([pt.lat, pt.lng]);
      const gradient = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, REVEAL_RADIUS_PX);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(0.5, "rgba(0,0,0,0.8)");
      gradient.addColorStop(0.8, "rgba(0,0,0,0.3)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px.x, px.y, REVEAL_RADIUS_PX, 0, Math.PI * 2);
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

  function addExploredPoint(lat: number, lng: number) {
    const last = exploredPointsRef.current[exploredPointsRef.current.length - 1];
    if (last) {
      const d = haversine(last.lat, last.lng, lat, lng);
      if (d < 5) return;
    }
    exploredPointsRef.current.push({ lat, lng });
    setTilesExplored(exploredPointsRef.current.length);
    persistState();
    scheduleRedraw();
  }

  function moveMarkerTo(lat: number, lng: number) {
    const last = lastPosRef.current;

    if (last) {
      const d = haversine(last.lat, last.lng, lat, lng);
      totalDistRef.current += d;
      stepsRef.current += Math.round(d / 0.75);
      setSteps(stepsRef.current);
      setDistance(formatDist(totalDistRef.current));

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

    const route = await fetchRoute(prev.lat, prev.lng, targetLat, targetLng);

    if (route && route.length > 1) {
      moveAlongPoints(route.slice(1));
    } else {
      movingRef.current = false;
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
        color: "rgba(255,77,109,0.7)",
        weight: 4,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);

      let avatarPic: string | null = null;
      try { avatarPic = localStorage.getItem(AVATAR_KEY); } catch {}

      const bodyContent = avatarPic
        ? `<img src="${avatarPic}" class="wm-av-img" alt="" />`
        : "\u{1F9D1}";

      const avatarHTML = `
        <div class="wm-av-wrap">
          <div class="wm-av-ripple"></div>
          <div class="wm-av-ripple"></div>
          <div class="wm-av-ripple"></div>
          <div class="wm-av-accuracy"></div>
          <div class="wm-av-body ${avatarPic ? "has-img" : ""}" id="wm-avBody">${bodyContent}</div>
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

  return (
    <div className="wm-root">
      <div ref={mapContainerRef} className="wm-map" />
      <canvas ref={fogCanvasRef} className="wm-fog-canvas" />

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
            <div className="wm-compass">
              <div className="wm-compass-n">N</div>
              <div
                className="wm-compass-needle"
                style={{ transform: `rotate(${compassDeg}deg)` }}
              />
            </div>
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

      <div className={`wm-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
