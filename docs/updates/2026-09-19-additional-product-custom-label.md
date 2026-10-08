# Additional-product custom tooth-chart label

**Date:** 2026-09-19

## Issue

In Case Design Center / slip creation, the first (card-0) product correctly showed the
product's **Enable custom label** text above the tooth chart. Products added later
(e.g. mandibular after maxillary) fell back to the default
`Select teeth to replace with {product name}` prompt.

## Cause

Later-added products are stored as a slim stub from `buildAddedProductStub` /
`fetchCaseDesignProductDetails`. That stub omitted `enable_custom_label` and
`custom_label`. The arch panel hints also preferred the stub over the hydrated
product already cached on the virtual tooth (`-cardId`).

## Fix

1. Map and copy `enable_custom_label` / `custom_label` onto the added-product stub.
2. Resolve tooth-selection hints from the hydrated product (`getToothProduct(arch, -cardId)` /
   `active*Product`) before falling back to the stub.
