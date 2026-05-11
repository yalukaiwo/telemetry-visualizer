"use client";

import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import chroma from "chroma-js";
import useLogGpsStore, { IGpsData } from "@/lib/store/LogGpsStore";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./common";
import { isNumber } from "@/lib/utils";
import L, { LatLng } from "leaflet";
import useDisplayDataStore from "@/lib/store/DisplayDataStore";
import { useTheme } from "next-themes";

export function findClosestPoint(
  clickedLatLng: LatLng,
  pointList: IGpsData[]
): IGpsData | null {
  let minDist = Infinity;
  let closest: IGpsData | null = null;

  for (const point of pointList) {
    const dist = L.latLng([point.Latitude, point.Longitude]).distanceTo(
      clickedLatLng
    );
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }

  return closest;
}

const TrackMap = () => {
  const { resolvedTheme } = useTheme();
  const gpsData = useLogGpsStore((state) => state.gpsData);

  const gpsKeys = useLogGpsStore((state) => state.gpsKeys).filter(
    (item) =>
      !["UTC Time", "Longitude", "Latitude"].includes(item.toString()) &&
      isNumber(gpsData[0][item])
  );
  const [gpsSelectedParam, setGpsSelectedParam] = useState<string | undefined>(
    undefined
  );

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    null
  );

  const markerOn = useDisplayDataStore((state) => state.markerOn);
  const setMarkerOn = useDisplayDataStore((state) => state.setMarkerOn);

  useEffect(() => {
    if (!markerOn && markerPosition) {
      setMarkerPosition(null);
      return;
    }

    if (markerOn && !markerPosition) {
      setMarkerPosition([
        Number(markerOn.Latitude),
        Number(markerOn.Longitude),
      ]);
      return;
    }

    if (markerOn && markerPosition) {
      if (
        Number(markerOn.Latitude) !== markerPosition[0] ||
        Number(markerOn.Longitude) !== markerPosition[1]
      ) {
        setMarkerPosition([
          Number(markerOn.Latitude),
          Number(markerOn.Longitude),
        ]);
      }
    }
  }, [markerOn, markerPosition]);

  const handleSelectChange = useMemo(
    () => (data: string) => {
      setGpsSelectedParam(data);
    },
    []
  );

  const filteredGpsData = useMemo(
    () =>
      gpsData.filter((item) => {
        return Number(item.Latitude) !== 0 && Number(item.Longitude) != 0;
      }),
    [gpsData]
  );

  const segments = useMemo(() => {
    if (!filteredGpsData.length) return [];

    let colorScale = chroma.scale(["darkblue"]);

    if (gpsSelectedParam && gpsData[0][gpsSelectedParam]) {
      const dataVals: number[] = filteredGpsData.map((item) => {
        if (!item[gpsSelectedParam]) return 0;
        return Number(item[gpsSelectedParam]);
      });

      const minV = Math.min(...dataVals);
      const maxV = Math.max(...dataVals);

      colorScale = chroma
        .scale(["green", "yellow", "red"])
        .domain([minV, maxV]);
    }

    return filteredGpsData.slice(1).map((point, i) => {
      const prev = filteredGpsData[i];
      const color = colorScale(
        gpsSelectedParam && point[gpsSelectedParam]
          ? Number(point[gpsSelectedParam])
          : 1
      ).hex();

      return (
        <Polyline
          key={`${i}-${color}`} // force remount on color change
          pathOptions={{ color }}
          weight={3}
          eventHandlers={{
            click: (e) => {
              const latlng = e.latlng;

              const closest = findClosestPoint(latlng, gpsData);
              if (!closest) {
                setMarkerPosition(null);
                setMarkerOn(null);

                return;
              }

              closest.Latitude = Number(closest.Latitude);
              closest.Longitude = Number(closest.Longitude);

              setMarkerPosition([closest.Latitude, closest.Longitude]);
              setMarkerOn({
                ...closest,
                "UTC Time":
                  closest["UTC Time"].toString().slice(0, 2) +
                  ":" +
                  closest["UTC Time"].toString().slice(2, 4) +
                  ":" +
                  closest["UTC Time"].toString().slice(4, 6) +
                  "." +
                  closest["UTC Time"].toString().slice(7, 10),
              });
            },
          }}
          positions={[
            [prev.Latitude, prev.Longitude],
            [point.Latitude, point.Longitude],
          ]}
        />
      );
    });
  }, [filteredGpsData, gpsData, gpsSelectedParam, setMarkerOn]);

  return (
    <>
      {filteredGpsData.length > 0 ? (
        <div className="w-full h-full relative">
          <MapContainer
            center={[filteredGpsData[0].Latitude, filteredGpsData[0].Longitude]}
            zoom={15}
            className="h-full w-full z-0"
          >
            <TileLayer
              url={
                resolvedTheme === "dark"
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
            />
            {segments}
            {markerPosition && <Marker position={markerPosition} />}
          </MapContainer>
          {gpsKeys.length > 0 ? (
            <div className="absolute top-2.5 right-2.5 z-50">
              <Select onValueChange={handleSelectChange}>
                <SelectTrigger className="mx-auto font-sans">
                  <SelectValue placeholder="Select" className="font-sans" />
                </SelectTrigger>
                <SelectContent className="font-sans">
                  {gpsKeys.map((item) => (
                    <SelectItem
                      className="font-sans"
                      key={item.toString()}
                      value={item.toString()}
                    >
                      {item.toString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-900 font-mono text-sm h-full w-full flex items-center justify-center">
          GPS data invalid or unavailable
        </div>
      )}
    </>
  );
};

export default TrackMap;
