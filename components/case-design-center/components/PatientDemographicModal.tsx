"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SelectField } from "./fields/SelectField";
import { FieldInput } from "./fields/FieldInput";
import type { ProductDemographicSource } from "@/lib/product-demographics";
import { productRequiresAge, productRequiresGender } from "@/lib/product-demographics";

const MIN_AGE_CHARS_TO_AUTO_SUBMIT = 2;

export function PatientDemographicModal({
  open,
  product,
  productName,
  initialGender = "",
  initialAge = "",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  product: ProductDemographicSource | null;
  productName?: string;
  initialGender?: string;
  initialAge?: string;
  onConfirm: (values: { gender: string; age: string }) => void;
  onCancel: () => void;
}) {
  const [gender, setGender] = useState(initialGender);
  const [age, setAge] = useState(initialAge);
  const [genderOpen, setGenderOpen] = useState(false);
  const [ageVisible, setAgeVisible] = useState(false);
  const ageInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const needsGender = productRequiresGender(product);
  const needsAge = productRequiresAge(product);

  const tryAutoConfirm = useCallback(
    (g: string, a: string) => {
      if (submittingRef.current) return;
      const genderOk = !needsGender || Boolean(g.trim());
      const ageOk = !needsAge || a.trim().length >= MIN_AGE_CHARS_TO_AUTO_SUBMIT;
      if (genderOk && ageOk) {
        submittingRef.current = true;
        onConfirm({ gender: g.trim(), age: a.trim() });
      }
    },
    [needsGender, needsAge, onConfirm],
  );

  useEffect(() => {
    if (!open) {
      submittingRef.current = false;
      return;
    }
    submittingRef.current = false;
    setGender(initialGender);
    setAge(initialAge);

    const hasGender = Boolean(initialGender.trim());

    if (needsGender && !hasGender) {
      setAgeVisible(false);
      setGenderOpen(true);
    } else if (needsAge) {
      setAgeVisible(true);
      setGenderOpen(false);
    } else {
      setAgeVisible(false);
      setGenderOpen(false);
    }
  }, [open, initialGender, initialAge, needsGender, needsAge]);

  useEffect(() => {
    if (!open || !ageVisible || !needsAge) return;
    const timer = setTimeout(() => ageInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [open, ageVisible, needsAge]);

  const handleGenderChange = (value: string) => {
    setGender(value);
    setGenderOpen(false);
    if (needsAge) {
      setAgeVisible(true);
    } else {
      tryAutoConfirm(value, age);
    }
  };

  const handleAgeChange = (value: string) => {
    setAge(value);
    if (value.trim().length >= MIN_AGE_CHARS_TO_AUTO_SUBMIT) {
      tryAutoConfirm(gender, value);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-[420px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle
            className="font-semibold text-xl sm:text-[22px]"
            style={{ fontFamily: "Verdana", fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Patient details
          </DialogTitle>
          {productName && (
            <p className="text-sm text-[#7f7f7f] mt-1">
              Required for <span className="font-medium text-[#1d1d1b]">{productName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="px-4 pb-2 flex flex-col gap-3">
          {needsGender && (
            <SelectField
              label="Gender"
              value={gender}
              options={["Male", "Female"]}
              onChange={handleGenderChange}
              caseSubmitted={false}
              optional
              open={genderOpen}
              onOpenChange={setGenderOpen}
              className="w-full"
            />
          )}
          {needsAge && ageVisible && (
            <FieldInput
              label="Age"
              value={age}
              submitted={false}
              onChange={handleAgeChange}
              className="w-full"
              type="number"
              inputRef={ageInputRef}
            />
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            style={{
              border: "2px solid #9BA5B7",
              borderRadius: "6px",
              fontFamily: "Verdana",
              fontWeight: 700,
              fontSize: "12px",
              color: "#9BA5B7",
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
