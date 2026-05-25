"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function OTPInput({ value, onChange, error, disabled }: OTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync internal digits array when external value changes
  useEffect(() => {
    const val = value || "";
    const newDigits = Array(6).fill("");
    for (let i = 0; i < Math.min(val.length, 6); i++) {
      newDigits[i] = val[i];
    }
    setDigits(newDigits);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^[0-9]?$/.test(val)) return; // Only allow single digits

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    const code = newDigits.join("");
    onChange(code);

    // Auto-focus next input if a digit was entered
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      // If backspace pressed on an empty box, clear the previous box and focus it
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      } else if (digits[index]) {
        // Just clear current box
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Ensure it's a 6-digit number

    const newDigits = pastedData.split("");
    setDigits(newDigits);
    onChange(pastedData);

    // Focus last input box
    inputRefs.current[5]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 md:gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold rounded-xl border bg-card text-card-foreground transition-all duration-200 outline-hidden focus:ring-2 focus:ring-primary focus:border-primary",
            error 
              ? "border-destructive focus:ring-destructive focus:border-destructive animate-pulse" 
              : "border-border hover:border-muted-foreground/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
