"use client";

import { useState } from "react";
import type { ActiveCardType } from "../types";

export function useImplantState() {
  const [activeCardType, setActiveCardType] = useState<ActiveCardType>({
    right1: null,
    right2: null,
  });

  const [right1Inclusion, setRight1Inclusion] = useState<string>("1x Model with tissue");
  const [right1InclusionQty, setRight1InclusionQty] = useState<number>(1);
  const [right2Inclusion, setRight2Inclusion] = useState<string>("1x Model with tissue");
  const [right2InclusionQty, setRight2InclusionQty] = useState<number>(1);

  return {
    activeCardType,
    setActiveCardType,
    right1Inclusion,
    setRight1Inclusion,
    right1InclusionQty,
    setRight1InclusionQty,
    right2Inclusion,
    setRight2Inclusion,
    right2InclusionQty,
    setRight2InclusionQty,
  };
}
