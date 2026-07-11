"use client";

import {
  ChangeEvent,
  ChangeEventHandler,
  Dispatch,
  MouseEventHandler,
  SetStateAction,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Label,
  Toaster,
} from "./common";
import useLogGpsStore, { ILogData, IGpsData } from "@/lib/store/LogGpsStore";
import { addSpeedToGpsData, SPEED_KEY } from "@/lib/gpsSpeed";
import Papa from "papaparse";
import FileInput from "./FileInput";
import useDisplayDataStore from "@/lib/store/DisplayDataStore";
import { useToast } from "@/lib/hooks";

function parseCSV<T extends object>(
  file: File,
  setName: Dispatch<SetStateAction<string | undefined>>,
  setData: Dispatch<SetStateAction<T[]>>,
  setKeys: Dispatch<SetStateAction<(keyof T)[]>>
) {
  Papa.parse<T>(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      // Set file name
      setName(file.name);

      // Parsed Data Response in array format
      setData(results.data);

      // Filtered Column Names
      setKeys((results.meta.fields as (keyof T)[]) || []);
    },
  });
}

const LogFileDrawer = () => {
  const {
    updateLogFilename,
    updateLogData,
    updateLogKeys,
    updateGpsFilename,
    updateGpsData,
    updateGpsKeys,
    clearData,
    formatData,
    scaleData,
  } = useLogGpsStore((state) => state);

  const { toast } = useToast();

  const clearSelection = useDisplayDataStore((state) => state.clearSelection);

  const [open, setOpen] = useState(false);

  const [logFilename, setLogFilename] = useState<string | undefined>(undefined);
  const [logData, setLogData] = useState<ILogData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setLogKeys] = useState<(keyof ILogData)[]>([]);

  const [gpsFilename, setGpsFilename] = useState<string | undefined>(undefined);
  const [gpsData, setGpsData] = useState<IGpsData[]>([]);
  const [gpsKeys, setGpsKeys] = useState<(keyof IGpsData)[]>([]);

  const [isOnlyLogFile, setIsOnlyLogFile] = useState<boolean>(false);
  const [isOnlyGpsFile, setIsOnlyGpsFile] = useState<boolean>(false);

  const handleLogFileChange = useMemo<ChangeEventHandler<HTMLInputElement>>(
    () => (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();

      if (!e.target.files || !e.target.files[0]) {
        setLogFilename(undefined);
        setLogData([]);
        setLogKeys([]);
        return;
      }
      parseCSV(e.target.files[0], setLogFilename, setLogData, setLogKeys);
    },
    []
  );

  const handleGpsFileChange = useMemo<ChangeEventHandler<HTMLInputElement>>(
    () => (e: ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();

      if (!e.target.files || !e.target.files[0]) {
        setGpsFilename(undefined);
        setGpsData([]);
        setGpsKeys([]);
        return;
      }
      parseCSV(e.target.files[0], setGpsFilename, setGpsData, setGpsKeys);
    },
    []
  );

  const handleSave = useMemo<MouseEventHandler<HTMLButtonElement>>(
    () => () => {
      if (
        (!gpsKeys.includes("Longitude") ||
          !gpsKeys.includes("Latitude") ||
          !gpsKeys.includes("UTC Time")) &&
        !isOnlyLogFile
      )
        return toast({
          title: "Error",
          description:
            'The GPS file MUST contain following properties: "Latitude", "Longitude", "UTC Time"',
          variant: "error",
          duration: 3000,
        });

      clearSelection();
      clearData();

      let filenameGps: string | undefined = undefined;
      let filenameLog: string | undefined = undefined;
      let cleanedGps: IGpsData[] = [];
      for (let i = 0; i < logData.length; i++) {
        cleanedGps.push({ Latitude: 0, Longitude: 0, "UTC Time": 0 });
      }
      let cleanedLog: ILogData[] = [];
      for (let i = 0; i < gpsData.length; i++) {
        cleanedLog.push({});
      }
      let keysGps: string[] = ["Latitude", "Longitude", "UTC Time"];
      let keysLog: string[] = [];

      if (!isOnlyLogFile) {
        filenameGps = gpsFilename || "blank.csv";

        // Parsed Data Response in array format
        keysGps = Object.keys(gpsData[0]).filter((key) => {
          return (
            ["UTC Time", "Latitude", "Longitude"].includes(key) ||
            gpsData.some((obj) => {
              return obj[key] && Number(obj[key]) !== 0;
            })
          );
        });

        // Filter each object to keep only the valid keys
        cleanedGps = gpsData.map((obj) =>
          Object.fromEntries(keysGps.map((key) => [key, obj[key]]))
        ) as IGpsData[];

        cleanedGps = addSpeedToGpsData(cleanedGps);
        keysGps.push(SPEED_KEY);

        updateGpsData(cleanedGps as IGpsData[]);
        updateGpsKeys(keysGps);
      }

      if (!isOnlyGpsFile) {
        filenameLog = logFilename || "blank.csv";

        // Parsed Data Response in array format
        keysLog = Object.keys(logData[0]).filter((key) => {
          return (
            ["UTC Time", "Latitude", "Longitude"].includes(key) ||
            logData.some((obj) => {
              return obj[key] && Number(obj[key]) !== 0;
            })
          );
        });

        // Filter each object to keep only the valid keys
        cleanedLog = logData.map((obj) =>
          Object.fromEntries(keysLog.map((key) => [key, obj[key]]))
        ) as ILogData[];
      }

      updateGpsFilename(filenameGps);
      updateGpsData(cleanedGps as IGpsData[]);
      updateGpsKeys(keysGps);

      updateLogFilename(filenameLog);
      updateLogData(cleanedLog as ILogData[]);
      updateLogKeys(keysLog);

      formatData();
      scaleData();

      setGpsFilename(undefined);
      setLogFilename(undefined);
      setLogData([]);
      setLogKeys([]);
      setGpsData([]);
      setGpsKeys([]);
    },
    [
      clearData,
      clearSelection,
      formatData,
      gpsData,
      gpsFilename,
      gpsKeys,
      isOnlyGpsFile,
      isOnlyLogFile,
      logData,
      logFilename,
      scaleData,
      toast,
      updateGpsData,
      updateGpsFilename,
      updateGpsKeys,
      updateLogData,
      updateLogFilename,
      updateLogKeys,
    ]
  );

  const resetLocalState = () => {
    setGpsFilename(undefined);
    setLogFilename(undefined);
    setLogData([]);
    setLogKeys([]);
    setGpsData([]);
    setGpsKeys([]);
  };

  const handleClose = useMemo<MouseEventHandler<HTMLButtonElement>>(
    () => () => resetLocalState(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleLoadSample = async () => {
    try {
      const [logResponse, gpsResponse] = await Promise.all([
        fetch("/sample-data/ArmyBase3Cylinder.MaxxECU-Log"),
        fetch("/sample-data/ArmyBase3Cylinder-GPS.csv"),
      ]);

      if (!logResponse.ok || !gpsResponse.ok)
        throw new Error("Failed to fetch");

      const [logText, gpsText] = await Promise.all([
        logResponse.text(),
        gpsResponse.text(),
      ]);

      const logResult = Papa.parse<ILogData>(logText, {
        header: true,
        skipEmptyLines: true,
      });
      const gpsResult = Papa.parse<IGpsData>(gpsText, {
        header: true,
        skipEmptyLines: true,
      });

      const rawLog = logResult.data;
      const rawGps = gpsResult.data;

      const keysGps = Object.keys(rawGps[0]).filter(
        (key) =>
          ["UTC Time", "Latitude", "Longitude"].includes(key) ||
          rawGps.some((obj) => obj[key] && Number(obj[key]) !== 0)
      );
      const cleanedGps = addSpeedToGpsData(
        rawGps.map((obj) =>
          Object.fromEntries(keysGps.map((key) => [key, obj[key]]))
        ) as IGpsData[]
      );
      keysGps.push(SPEED_KEY);

      const keysLog = Object.keys(rawLog[0]).filter(
        (key) =>
          ["UTC Time", "Latitude", "Longitude"].includes(key) ||
          rawLog.some((obj) => obj[key] && Number(obj[key]) !== 0)
      );
      const cleanedLog = rawLog.map((obj) =>
        Object.fromEntries(keysLog.map((key) => [key, obj[key]]))
      ) as ILogData[];

      clearSelection();
      clearData();

      updateGpsFilename("ArmyBase3Cylinder-GPS.csv");
      updateGpsData(cleanedGps);
      updateGpsKeys(keysGps);

      updateLogFilename("ArmyBase3Cylinder.MaxxECU-Log");
      updateLogData(cleanedLog);
      updateLogKeys(keysLog);

      formatData();
      scaleData();

      setOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load sample data.",
        variant: "error",
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetLocalState();
        }}
      >
        <DrawerTrigger asChild>
          <Button
            variant="secondary"
            className="font-sans text-sm cursor-pointer w-full"
          >
            Import new
          </Button>
        </DrawerTrigger>
        <DrawerContent className="sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle className="font-sans">
              Import files to visualize
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-sm font-sans">
              Telemetry logs from these files will be parsed and visualized.
              First log is assumed to have started at the same instant.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <div className="mb-4">
              <Button
                variant="secondary"
                className="w-full font-sans text-sm cursor-pointer"
                onClick={handleLoadSample}
              >
                Load sample data
              </Button>
              <p className="mt-1.5 text-xs text-slate-500 font-sans">
                Army Base 3-cylinder MaxxECU session with GPS data
              </p>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#090E1A] px-2 text-slate-500 font-sans">
                  or upload your own files
                </span>
              </div>
            </div>
            {!isOnlyGpsFile && (
              <>
                <FileInput
                  id="logFileInput"
                  label="Upload the ECU log file"
                  handleChange={handleLogFileChange}
                  className="mb-2"
                  accept=".csv, .MaxxECU-Log"
                  note="Accepted file types: .CSV, .MaxxECU-Log"
                />
                <Label
                  htmlFor={"onlyLogFile"}
                  className="font-sans text-sm cursor-pointer flex items-center gap-3 mb-4 relative"
                >
                  <Checkbox
                    onCheckedChange={(checkedState) => {
                      setIsOnlyLogFile(!!checkedState);
                    }}
                    checked={isOnlyLogFile}
                    id={"onlyLogFile"}
                  />
                  Upload only the ECU file
                </Label>
              </>
            )}
            {!isOnlyLogFile && (
              <>
                <FileInput
                  id="gpsFileInput"
                  label="Upload the GPS log file"
                  handleChange={handleGpsFileChange}
                  accept=".csv"
                  note="Accepted file types: .CSV"
                  className="mb-2"
                />
                <Label
                  htmlFor={"onlyGpsFile"}
                  className="font-sans text-sm cursor-pointer flex items-center gap-3 mb-4 relative"
                >
                  <Checkbox
                    onCheckedChange={(checkedState) => {
                      setIsOnlyGpsFile(!!checkedState);
                    }}
                    checked={isOnlyGpsFile}
                    id={"onlyGpsFile"}
                  />
                  Upload only the GPS file
                </Label>
              </>
            )}
          </DrawerBody>
          <DrawerFooter className="mt-6">
            <DrawerClose asChild>
              <Button
                className="mt-2 w-full sm:mt-0 sm:w-fit font-sans cursor-pointer"
                variant="secondary"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button
                type="submit"
                disabled={(() => {
                  if (isOnlyGpsFile && !!gpsFilename) return false;
                  if (isOnlyLogFile && !!logFilename) return false;
                  if (gpsFilename && logFilename) return false;

                  return true;
                })()}
                className="w-full sm:w-fit font-sans cursor-pointer"
                onClick={handleSave}
              >
                Import
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Toaster />
    </>
  );
};

export default LogFileDrawer;
