import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, LayersControl, LayerGroup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { regions, customerPoints } from "@/lib/dashboard-data";

const dotFill: Record<AlertLevel, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  active: "#2fcb6e",
  calm: "#94a3b8",
};

const levelLabel: Record<AlertLevel, string> = {
  critical: "Critical alert",
  warning: "Warning",
  active: "Active sales",
  calm: "Calm",
};

interface Props {
  variant?: "compact" | "full";
  centers?: { region: string; sales: number }[];
  customers?: { id: string; name: string; center: string; address: string; state: string; lat: number; lng: number; type: "new" | "returning"; sales: number; orders: number }[];
}

export function AfricaMap({ variant = "compact", centers = [], customers = [] }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const height = variant === "full" ? 620 : 460;

  if (!mounted) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/30"
        style={{ height }}
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border"
      style={{ height, background: "#f0f4f8" }}
    >
      <MapContainer
        center={[8.5, 8.5]}
        zoom={4}
        minZoom={3}
        maxZoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        worldCopyJump={false}
        maxBounds={L.latLngBounds([-10, -25], [30, 30])}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Light">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Distribution Centers">
            <LayerGroup>
              {regions.filter((region) => ["abuja", "lagos", "kano", "ibadan", "adamawa", "ph", "taraba", "liberia"].includes(region.id)).map((r) => {
                const live = centers.find((center) => center.region.toLowerCase().startsWith(r.id === "ph" ? "portharcourt" : r.id));
                const rank = [...centers].sort((a, b) => b.sales - a.sales).findIndex((center) => center.region === live?.region);
                const color = rank === 0 ? "#11455b" : rank < 3 ? "#2fcb6e" : rank < 6 ? "#f59e0b" : "#94a3b8";
                const isNigeria = r.country === "Nigeria";
                const radius = isNigeria ? 11 : 9;
                return (
                  <CircleMarker
                    key={r.id}
                    center={[r.lat, r.lng]}
                    radius={radius}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2.5,
                      fillColor: color,
                      fillOpacity: 1,
                      className: r.level === "critical" ? "pulse-marker" : undefined,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                      <strong>{r.name}</strong> · {r.country}
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, color: "#11455b" }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {r.country} · Distribution Center
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color,
                          }}
                        >
                          {rank === 0 ? "Highest-selling center" : rank >= 0 ? `Sales rank #${rank + 1}` : "Awaiting live sales"}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12 }}>
                          <div>Sales MTD: <strong>₦{(live?.sales ?? 0).toFixed(2)}M</strong></div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Customers (by state)">
            <LayerGroup>
              {(customers.length > 0 ? customers : customerPoints.map((point) => ({ ...point, center: "", address: `${point.state} State`, sales: 0 }))).map((c) => {
                const color = c.type === "new" ? "#2fcb6e" : "#11455b";
                return (
                  <CircleMarker
                    key={c.id}
                    center={[c.lat, c.lng]}
                    radius={5}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 0.95,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -5]}>
                      <strong>{c.name}</strong> · {c.state}
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 700, color: "#11455b" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{c.address}</div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          Type: <strong style={{ color }}>{c.type === "new" ? "New" : "Returning"}</strong>
                        </div>
                        <div style={{ fontSize: 12 }}>Orders: <strong>{c.orders}</strong></div>
                        <div style={{ fontSize: 12 }}>Sales: <strong>₦{c.sales.toLocaleString()}</strong></div>
                        {c.center && <div style={{ fontSize: 12 }}>Center: <strong>{c.center}</strong></div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 bottom-3 z-[400] flex flex-col gap-1.5 rounded-md bg-white/95 p-2 text-[11px] shadow-sm">
        <div className="font-semibold text-foreground">Sales performance</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-navy" /><span className="text-muted-foreground">Highest</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-green" /><span className="text-muted-foreground">Top 3</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warn" /><span className="text-muted-foreground">Mid-tier</span></div>
        </div>
        <div className="mt-1 font-semibold text-foreground">Customers</div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2fcb6e" }} />
            <span className="text-muted-foreground">New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#11455b" }} />
            <span className="text-muted-foreground">Returning</span>
          </div>
        </div>
      </div>
    </div>
  );
}
