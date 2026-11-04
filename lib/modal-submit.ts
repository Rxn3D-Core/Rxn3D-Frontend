// RXN-44: single-flight submit for reason modals (Hold / Resume / Cancel).
// When `submit` returns a promise, the modal stays busy until it settles and
// keeps its form values (the caller closes the modal on success, leaves it open
// on failure). Returns "skipped" while a previous submit is still in flight,
// "sync" when `submit` returned no promise, and "settled" after the promise
// resolved or rejected. Rejections are swallowed: the caller reports its errors.

export type ModalSubmitOutcome = "skipped" | "sync" | "settled";

export async function runModalSubmit(
  inFlight: { current: boolean },
  setSubmitting: (value: boolean) => void,
  submit: () => unknown
): Promise<ModalSubmitOutcome> {
  if (inFlight.current) return "skipped";
  const result = submit();
  if (!result || typeof (result as PromiseLike<unknown>).then !== "function") {
    return "sync";
  }
  inFlight.current = true;
  setSubmitting(true);
  try {
    await result;
  } catch {
    // The caller already shows its own error toast.
  } finally {
    inFlight.current = false;
    setSubmitting(false);
  }
  return "settled";
}
