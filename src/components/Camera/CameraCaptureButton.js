import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import PhotoResultSheet from "./PhotoResultSheet";
import { analyzePhoto } from "../../lib/geminiClient";
import { addMealLog, addMealPhoto } from "../../db/indexedDb";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Must match the server-side cap in api/analyze-photo.js so a client-accepted
// photo never gets rejected once base64-encoded and sent to the proxy.
const MAX_BYTES = 3 * 1024 * 1024;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CameraCaptureButton() {
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("error");
      setError("Unsupported image type.");
      setOpen(true);
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setError("Image is too large.");
      setOpen(true);
      return;
    }

    setOpen(true);
    setStatus("loading");
    setResult(null);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const base64Data = await readFileAsBase64(file);
      const geminiResult = await analyzePhoto(
        { mimeType: file.type, base64Data },
        controller.signal
      );

      if (controller.signal.aborted) return;

      setResult(geminiResult);
      setStatus("done");

      // One item representing the whole photographed meal, carrying the
      // whole-meal macro estimate — NOT one item per identified food each
      // repeating the same totals (that would multiply calories in daily
      // sums by however many foods were identified in a single photo).
      const macros = geminiResult.estimatedMacros;
      const items =
        (geminiResult.identifiedFoods || []).length > 0
          ? [
              {
                name: geminiResult.identifiedFoods.join(", "),
                calories: macros?.calories ?? null,
                protein: macros?.protein ?? null,
                fat: macros?.fat ?? null,
                carb: macros?.carb ?? null,
                iron: macros?.iron ?? null,
                calcium: macros?.calcium ?? null,
              },
            ]
          : [];

      const mealLog = await addMealLog({
        timestamp: new Date().toISOString(),
        source: "photo",
        items,
        costType: null,
      });
      await addMealPhoto({ mealLogId: mealLog.id, geminiResult });
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setError("Couldn't analyze this photo. Try again.");
    }
  };

  const handleDismiss = () => {
    abortControllerRef.current?.abort();
    setOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={() => fileInputRef.current?.click()}
        aria-label="Capture meal photo"
        className="tap-target"
        style={{
          position: "fixed",
          right: 20,
          bottom: `calc(80px + env(safe-area-inset-bottom))`,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--color-accent)",
          color: "#fff",
          fontSize: 22,
          zIndex: 15,
        }}
      >
        📷
      </motion.button>
      <PhotoResultSheet
        open={open}
        status={status}
        result={result}
        error={error}
        onDismiss={handleDismiss}
      />
    </>
  );
}
