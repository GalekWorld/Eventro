export function readFormValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function clampFormValue(value: FormDataEntryValue | null, maxLength: number) {
  return readFormValue(value).slice(0, maxLength);
}
