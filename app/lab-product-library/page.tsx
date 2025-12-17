"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LabProductLibraryPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/lab-product-library/case-tracking");
  }, [router]);

  return null;
}
