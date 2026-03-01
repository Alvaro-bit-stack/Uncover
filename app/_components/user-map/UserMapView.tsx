"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";

const FOG_COLOR = "rgba(30, 25, 40, 0.92)";
const REVEAL_RADIUS_M = 12;
const DEG_PER_M_LAT = 1 / 111320;

type Point = { lat: number; lng: number };

function walkStreet(coords: [number, number][], density = 6): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[i + 1];
    for (let t = 0; t < density; t++) {
      const f = t / density;
      pts.push({ lat: lat1 + (lat2 - lat1) * f, lng: lng1 + (lng2 - lng1) * f });
    }
  }
  const last = coords[coords.length - 1];
  pts.push({ lat: last[0], lng: last[1] });
  return pts;
}

const MOCK_DATA: Record<string, { steps: number; distanceM: number; tiles: number; points: Point[] }> = {
  u1: {
    steps: 12400, distanceM: 9300, tiles: 82,
    points: walkStreet([
      [40.7440, -74.0280], [40.7440, -74.0255],
      [40.7448, -74.0255], [40.7448, -74.0235],
      [40.7455, -74.0235], [40.7455, -74.0260],
    ]),
  },
  u2: {
    steps: 11100, distanceM: 8200, tiles: 65,
    points: walkStreet([
      [40.7460, -74.0270], [40.7445, -74.0270],
      [40.7445, -74.0250], [40.7460, -74.0250],
    ]),
  },
  u3: {
    steps: 4820, distanceM: 3600, tiles: 38,
    points: walkStreet([
      [40.7448, -74.0244], [40.7448, -74.0225],
      [40.7440, -74.0225],
    ]),
  },
  u4: {
    steps: 4200, distanceM: 3100, tiles: 30,
    points: walkStreet([
      [40.7435, -74.0260], [40.7435, -74.0240],
      [40.7445, -74.0240],
    ]),
  },
  u5: {
    steps: 3900, distanceM: 2900, tiles: 25,
    points: walkStreet([
      [40.7455, -74.0240], [40.7450, -74.0240],
      [40.7450, -74.0255],
    ]),
  },
};

interface UserMapViewProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export default function UserMapView({ userId, userName, onClose }: UserMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rafRef = useRef(0);
  const pointsRef = useRef<Point[]>([]);
  const [ready, setReady] = useState(false);

  const userData = MOCK_DATA[userId];

  function metersToPixels(meters: number, lat: number) {
    const map = mapRef.current;
    if (!map) return 60;
    const p1 = map.latLngToContainerPoint({ lat, lng: 0 });
    const p2 = map.latLngToContainerPoint({ lat: lat + meters * DEG_PER_M_LAT, lng: 0 });
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

    const pts = pointsRef.current;
    if (pts.length === 0) {
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    const R = metersToPixels(REVEAL_RADIUS_M, map.getCenter().lat);

    if (pts.length >= 2) {
      ctx.lineWidth = R * 1.2;
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapContainerRef.current || !userData) return;

      pointsRef.current = userData.points;

      const Leaf = (await import("leaflet")).default;
      if (cancelled) return;

      const pts = userData.points;
      const center: [number, number] = pts.length > 0
        ? [
            pts.reduce((s, p) => s + p.lat, 0) / pts.length,
            pts.reduce((s, p) => s + p.lng, 0) / pts.length,
          ]
        : [40.7448, -74.0244];

      const map = Leaf.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, 14);

      Leaf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        tileSize: 256,
      }).addTo(map);

      map.on("move", scheduleRedraw);
      map.on("zoom", scheduleRedraw);
      map.on("resize", scheduleRedraw);

      mapRef.current = map;
      setReady(true);
      scheduleRedraw();
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function formatDist(m: number) {
    return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m";
  }

  if (!userData) {
    return (
      <div className="um-overlay">
        <div className="um-header">
          <button className="um-back" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="um-title">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="um-overlay">
      <div className="um-header">
        <button className="um-back" onClick={onClose} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="um-title">{userName}&apos;s Map</div>
      </div>

      <div className="um-map-wrap">
        <div ref={mapContainerRef} className="um-map" />
        <canvas ref={fogCanvasRef} className="um-fog" />
        {!ready && <div className="um-loading">Loading map...</div>}
      </div>

      <div className="um-stats">
        <div className="um-stat">
          <span className="um-stat-num">{userData.steps.toLocaleString()}</span>
          <span className="um-stat-lbl">Steps</span>
        </div>
        <div className="um-stat">
          <span className="um-stat-num">{formatDist(userData.distanceM)}</span>
          <span className="um-stat-lbl">Distance</span>
        </div>
        <div className="um-stat">
          <span className="um-stat-num">{userData.tiles}</span>
          <span className="um-stat-lbl">Explored</span>
        </div>
      </div>
    </div>
  );
}
