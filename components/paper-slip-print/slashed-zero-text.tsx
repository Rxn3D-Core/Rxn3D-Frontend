/** Pan numbers mix digits and letters, so zero gets a stroke to tell it apart from the letter O. */
export function SlashedZeroText({ value }: { value: string }) {
  return (
    <>
      {value.split(/(0)/).map((part, index) =>
        part === "0" ? (
          <span key={index} className="relative inline-block leading-none">
            0
            <span
              aria-hidden
              className="absolute left-1/2 bg-current"
              style={{ top: "0.12em", width: "0.07em", height: "0.76em", transform: "translateX(-50%) rotate(25deg)" }}
            />
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
