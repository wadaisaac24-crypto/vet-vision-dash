import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ClientMap = lazy(() =>
  import("./africa-map.client").then((module) => ({ default: module.AfricaMap })),
);

interface Props {
  variant?: "compact" | "full";
  centers?: { region: string; sales: number }[];
  customers?: { id: string; name: string; center: string; address: string; state: string; lat: number; lng: number; type: "new" | "returning"; sales: number; orders: number }[];
}

function MapFallback({ variant = "compact" }: Props) {
  return (
    <div
      className={variant === "full" ? "h-[620px] w-full rounded-lg bg-muted/30" : "h-[460px] w-full rounded-lg bg-muted/30"}
      aria-label="Loading operations map"
    />
  );
}

export function AfricaMap(props: Props) {
  return (
    <ClientOnly fallback={<MapFallback {...props} />}>
      <Suspense fallback={<MapFallback {...props} />}>
        <ClientMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}