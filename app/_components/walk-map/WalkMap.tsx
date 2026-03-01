"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type L from "leaflet";

type Phase = "prompt" | "locating" | "ready" | "error";

interface AccuracyInfo {
  active: number;
  tier: "good" | "ok" | "poor";
  label: string;
}

const TILE_SIZE_M = 20;
const GRID_RADIUS = 15;
const DEG_PER_M_LAT = 1 / 111320;
const degPerMLng = (lat: number) => 1 / (111320 * Math.cos((lat * Math.PI) / 180));

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

function getAccuracyInfo(acc: number): AccuracyInfo {
  if (acc <= 5) return { active: 4, tier: "good", label: "EXCELLENT" };
  if (acc <= 15) return { active: 3, tier: "good", label: "GREAT" };
  if (acc <= 30) return { active: 2, tier: "ok", label: "GOOD" };
  if (acc <= 60) return { active: 1, tier: "poor", label: "POOR" };
  return { active: 0, tier: "poor", label: "WEAK" };
}

function formatDist(m: number) {
  return m >= 1000 ? (m / 1000).toFixed(2) + "km" : Math.round(m) + "m";
}

function formatCoord(lat: number, lng: number) {
  const la = Math.abs(lat).toFixed(5) + (lat >= 0 ? "\u00B0N" : "\u00B0S");
  const lo = Math.abs(lng).toFixed(5) + (lng >= 0 ? "\u00B0E" : "\u00B0W");
  return `${la}  ${lo}`;
}

function tileKey(row: number, col: number) {
  return `${row},${col}`;
}

function posToTile(lat: number, lng: number, originLat: number, originLng: number) {
  const dLatM = (lat - originLat) / DEG_PER_M_LAT;
  const dLngM = (lng - originLng) / degPerMLng(originLat);
  return {
    row: Math.floor(dLatM / TILE_SIZE_M),
    col: Math.floor(dLngM / TILE_SIZE_M),
  };
}

export default function WalkMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const positionsRef = useRef<[number, number][]>([]);
  const isFollowingRef = useRef(true);
  const stepsRef = useRef(0);
  const totalDistRef = useRef(0);
  const lastMilestoneRef = useRef(0);

  const originRef = useRef<{ lat: number; lng: number } | null>(null);
  const fogRectsRef = useRef<Map<string, L.Rectangle>>(new Map());
  const exploredRef = useRef<Set<string>>(new Set());
  const simPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("prompt");
  const [simMode, setSimMode] = useState(false);
  const [loadBar, setLoadBar] = useState(0);
  const [loadStatus, setLoadStatus] = useState("Tap below to enable GPS tracking");
  const [liveStatus, setLiveStatus] = useState("WAITING");
  const [coordLabel, setCoordLabel] = useState("WAITING FOR GPS\u2026");
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState("0m");
  const [speed, setSpeed] = useState("0");
  const [accuracy, setAccuracy] = useState("\u2014");
  const [accuracyInfo, setAccuracyInfo] = useState<AccuracyInfo>({
    active: 0,
    tier: "poor",
    label: "\u2014",
  });
  const [compassDeg, setCompassDeg] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [tilesExplored, setTilesExplored] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalTiles = (GRID_RADIUS * 2 + 1) ** 2;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  function revealTile(lat: number, lng: number) {
    const origin = originRef.current;
    if (!origin) return;

    const { row, col } = posToTile(lat, lng, origin.lat, origin.lng);
    const key = tileKey(row, col);

    if (exploredRef.current.has(key)) return;
    exploredRef.current.add(key);

    const rect = fogRectsRef.current.get(key);
    if (rect) {
      rect.setStyle({ fillOpacity: 0, color: "rgba(255,77,109,0.25)", weight: 1 });
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const adjKey = tileKey(row + dr, col + dc);
      if (exploredRef.current.has(adjKey)) continue;
      const adjRect = fogRectsRef.current.get(adjKey);
      if (adjRect) adjRect.setStyle({ fillOpacity: 0.45 });
    }

    setTilesExplored(exploredRef.current.size);
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
    accuracyCircleRef.current?.setLatLng([lat, lng]);

    if (isFollowingRef.current && mapRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 0.3 });
    }

    revealTile(lat, lng);
    setCoordLabel(formatCoord(lat, lng));
  }

  function handleSimMove(dir: "up" | "down" | "left" | "right") {
    const prev = simPosRef.current;
    if (!prev) return;

    const step = TILE_SIZE_M * 0.8;
    let lat = prev.lat;
    let lng = prev.lng;
    if (dir === "up") lat += step * DEG_PER_M_LAT;
    if (dir === "down") lat -= step * DEG_PER_M_LAT;
    if (dir === "right") lng += step * degPerMLng(lat);
    if (dir === "left") lng -= step * degPerMLng(lat);

    const headings = { up: 0, right: 90, down: 180, left: 270 } as const;
    setCompassDeg(headings[dir]);

    const avDir = document.getElementById("wm-avDir");
    if (avDir) {
      avDir.style.transform = `rotate(${headings[dir]}deg)`;
      avDir.classList.add("visible");
    }

    simPosRef.current = { lat, lng };
    moveMarkerTo(lat, lng);
  }

  async function initMap(lat: number, lng: number) {
    if (!mapContainerRef.current || mapRef.current) return;

    const Leaf = (await import("leaflet")).default;

    const map = Leaf.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
    }).setView([lat, lng], 17);

    Leaf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      tileSize: 256,
    }).addTo(map);

    // Build fog grid
    originRef.current = { lat, lng };
    const dLat = TILE_SIZE_M * DEG_PER_M_LAT;
    const dLng = TILE_SIZE_M * degPerMLng(lat);
    for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
      for (let c = -GRID_RADIUS; c <= GRID_RADIUS; c++) {
        const south = lat + r * dLat;
        const west = lng + c * dLng;
        const rect = Leaf.rectangle(
          [[south, west], [south + dLat, west + dLng]],
          {
            fillColor: "#0d0d14",
            fillOpacity: 0.75,
            color: "rgba(255,255,255,0.06)",
            weight: 0.5,
            interactive: false,
          }
        ).addTo(map);
        fogRectsRef.current.set(tileKey(r, c), rect);
      }
    }

    accuracyCircleRef.current = Leaf.circle([lat, lng], {
      radius: 20,
      fillColor: "rgba(255,77,109,0.08)",
      fillOpacity: 1,
      color: "rgba(255,77,109,0.25)",
      weight: 1.5,
      dashArray: "4 4",
      interactive: false,
    }).addTo(map);

    trailRef.current = Leaf.polyline([], {
      color: "rgba(255,77,109,0.7)",
      weight: 4,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);

    const avatarHTML = `
      <div class="wm-av-wrap">
        <div class="wm-av-ripple"></div>
        <div class="wm-av-ripple"></div>
        <div class="wm-av-ripple"></div>
        <div class="wm-av-accuracy"></div>
        <div class="wm-av-body" id="wm-avBody">\u{1F9D1}</div>
        <div class="wm-av-shadow"></div>
        <div class="wm-av-dir" id="wm-avDir"></div>
      </div>`;

    const avatarIcon = Leaf.divIcon({
      className: "",
      html: avatarHTML,
      iconSize: [72, 72],
      iconAnchor: [36, 36],
    });

    markerRef.current = Leaf.marker([lat, lng], { icon: avatarIcon }).addTo(map);

    map.on("dragstart", () => { isFollowingRef.current = false; });

    mapRef.current = map;
    revealTile(lat, lng);
  }

  async function handleRequestGPS() {
    setPhase("locating");
    setLoadStatus("Requesting location permission\u2026");
    setLoadBar(30);

    if (!navigator.geolocation) {
      setLoadStatus("\u274C Geolocation not supported on this device.");
      setPhase("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLoadBar(70);
        setLoadStatus("\u2705 Location found! Loading map\u2026");
        const { latitude: lat, longitude: lng } = pos.coords;
        await initMap(lat, lng);
        setLoadBar(100);
        setTimeout(() => {
          setPhase("ready");
          setLiveStatus("LIVE");
          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => {
              const { latitude: la, longitude: lo, accuracy: acc, speed: spd, heading: h } = p.coords;

              if (h !== null && h !== undefined) {
                setCompassDeg(h);
                const dir = document.getElementById("wm-avDir");
                if (dir) { dir.style.transform = `rotate(${h}deg)`; dir.classList.add("visible"); }
              }

              setAccuracyInfo(getAccuracyInfo(acc));
              setAccuracy(acc < 1000 ? Math.round(acc) + "m" : ">1km");
              accuracyCircleRef.current?.setLatLng([la, lo]).setRadius(acc);

              const MIN_MOVE = Math.max(3, acc * 0.3);
              const last = lastPosRef.current;

              if (last) {
                const d = haversine(last.lat, last.lng, la, lo);
                if (d < MIN_MOVE) return;

                totalDistRef.current += d;
                stepsRef.current += Math.round(d / 0.75);
                setSteps(stepsRef.current);
                setDistance(formatDist(totalDistRef.current));

                const body = document.getElementById("wm-avBody");
                if (body) { body.classList.add("walking"); body.textContent = "\u{1F6B6}"; }
                if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
                walkTimeoutRef.current = setTimeout(() => {
                  if (body) { body.classList.remove("walking"); body.textContent = "\u{1F9D1}"; }
                }, 2500);

                const spdVal = spd !== null && spd >= 0 ? spd * 3.6 : (d / 1) * 3.6;
                setSpeed(spdVal.toFixed(1));

                positionsRef.current.push([la, lo]);
                if (positionsRef.current.length > 500) positionsRef.current.shift();
                trailRef.current?.setLatLngs([...positionsRef.current]);
              } else {
                positionsRef.current.push([la, lo]);
                trailRef.current?.setLatLngs([...positionsRef.current]);
                setLiveStatus("LIVE");
                showToast("\u{1F4CD} Location locked in!");
              }

              lastPosRef.current = { lat: la, lng: lo };
              markerRef.current?.setLatLng([la, lo]);
              revealTile(la, lo);

              if (isFollowingRef.current && mapRef.current) {
                mapRef.current.panTo([la, lo], { animate: true, duration: 0.8 });
              }
              setCoordLabel(formatCoord(la, lo));
            },
            (err) => {
              setLiveStatus("ERROR");
              if (err.code === 3) showToast("\u26A0\uFE0F GPS timeout \u2014 retrying\u2026");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }, 600);
      },
      (err) => {
        setLoadStatus(
          err.code === 1
            ? "\u274C Permission denied. Allow location access and reload."
            : "\u274C Could not get location. Make sure GPS is enabled."
        );
        setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function handleStartSimulation() {
    setPhase("locating");
    setLoadStatus("Loading simulation\u2026");
    setLoadBar(50);

    const lat = 40.7448;
    const lng = -74.0244;
    await initMap(lat, lng);
    simPosRef.current = { lat, lng };
    lastPosRef.current = { lat, lng };
    positionsRef.current = [[lat, lng]];
    trailRef.current?.setLatLngs([[lat, lng]]);
    setSimMode(true);
    setLoadBar(100);
    setLiveStatus("SIM");
    setAccuracy("SIM");
    setAccuracyInfo({ active: 4, tier: "good", label: "SIM" });
    setCoordLabel(formatCoord(lat, lng));

    setTimeout(() => {
      setPhase("ready");
      showToast("\u{1F3AE} Simulation mode \u2014 use arrows to move");
    }, 400);
  }

  function handleRecenter() {
    isFollowingRef.current = true;
    const last = lastPosRef.current;
    if (last && mapRef.current) {
      mapRef.current.flyTo([last.lat, last.lng], 17, { duration: 0.8 });
    }
  }

  // Milestone toasts
  useEffect(() => {
    if (phase !== "ready") return;
    const MILESTONES = [100, 500, 1000, 2000, 5000, 10000];
    const id = setInterval(() => {
      const m = MILESTONES.find(
        (ms) => stepsRef.current >= ms && ms > lastMilestoneRef.current
      );
      if (m) {
        lastMilestoneRef.current = m;
        showToast(`\u{1F389} ${m.toLocaleString()} steps!`);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [phase, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const pillClasses = (i: number) => {
    if (i >= accuracyInfo.active) return "wm-acc-pill";
    return `wm-acc-pill active ${accuracyInfo.tier}`;
  };

  const pct = totalTiles > 0 ? ((tilesExplored / totalTiles) * 100).toFixed(1) : "0";

  return (
    <div className="wm-root">
      {phase !== "ready" && (
        <div className="wm-loading">
          <div className="wm-load-logo">{"\u{1F5FA}\uFE0F"}</div>
          <div className="wm-load-title">WalkMap</div>
          <div className="wm-load-sub">LIVE LOCATION TRACKER</div>
          <div className="wm-load-bar-wrap">
            <div className="wm-load-bar" style={{ width: `${loadBar}%` }} />
          </div>
          <div className="wm-load-status">{loadStatus}</div>
          {(phase === "prompt" || phase === "error") && (
            <div className="wm-load-buttons">
              <button className="wm-permission-btn" onClick={handleRequestGPS}>
                {"\u{1F4CD}"} Enable Location
              </button>
              <button className="wm-sim-btn" onClick={handleStartSimulation}>
                {"\u{1F3AE}"} Simulate Movement
              </button>
            </div>
          )}
        </div>
      )}

      <div ref={mapContainerRef} className="wm-map" />

      {phase === "ready" && (
        <>
          <div className="wm-top-bar">
            <div className="wm-app-brand">
              <div className="wm-app-name">WalkMap</div>
              <div className="wm-app-sub">{coordLabel}</div>
            </div>
            <div className="wm-live-badge">
              <div className="wm-live-dot" />
              <div className="wm-live-txt">{liveStatus}</div>
            </div>
          </div>

          <div className="wm-tiles-counter">
            <span className="wm-tiles-num">{tilesExplored}</span>
            <span className="wm-tiles-label">/ {totalTiles} tiles ({pct}%)</span>
          </div>

          <div className="wm-compass-wrap">
            <div className="wm-compass">
              <div className="wm-compass-n">N</div>
              <div
                className="wm-compass-needle"
                style={{ transform: `rotate(${compassDeg}deg)` }}
              />
            </div>
          </div>

          <button className="wm-recenter-btn" onClick={handleRecenter}>
            {"\u2295"}
          </button>

          {simMode && (
            <div className="wm-dpad">
              <button className="wm-dpad-btn wm-dpad-up" onClick={() => handleSimMove("up")}>{"\u25B2"}</button>
              <button className="wm-dpad-btn wm-dpad-left" onClick={() => handleSimMove("left")}>{"\u25C0"}</button>
              <button className="wm-dpad-btn wm-dpad-right" onClick={() => handleSimMove("right")}>{"\u25B6"}</button>
              <button className="wm-dpad-btn wm-dpad-down" onClick={() => handleSimMove("down")}>{"\u25BC"}</button>
            </div>
          )}

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
              <div className="wm-stat-chip">
                <div className="wm-num">{speed}</div>
                <div className="wm-lbl">km/h</div>
              </div>
              <div className="wm-stat-chip">
                <div className="wm-num">{accuracy}</div>
                <div className="wm-lbl">Accuracy</div>
              </div>
            </div>
            <div className="wm-gps-row">
              <div className="wm-gps-label">GPS SIGNAL</div>
              <div className="wm-accuracy-pills">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={pillClasses(i)} />
                ))}
              </div>
              <div className="wm-gps-label">{accuracyInfo.label}</div>
            </div>
          </div>
        </>
      )}

      <div className={`wm-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
