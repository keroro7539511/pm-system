import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";

export interface CsvResult { ok: number; fail: number }

export function useCsvImport(
  importRow: (row: Record<string, string>) => Promise<void>
) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setImporting(true);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let ok = 0;
        let fail = 0;
        for (const row of results.data) {
          try {
            await importRow(row);
            ok++;
          } catch {
            fail++;
          }
        }
        setImporting(false);
        setResult({ ok, fail });
        if (inputRef.current) inputRef.current.value = "";
      },
      error: () => {
        setImporting(false);
        setResult({ ok: 0, fail: -1 });
      },
    });
  }, [importRow]);

  const clearResult = useCallback(() => setResult(null), []);

  return { importing, result, inputRef, handleFile, clearResult };
}
