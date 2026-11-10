import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { toApiError } from './axios';

const handled = new WeakSet<object>();
export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
export function notifyError(error: unknown): void {
  if (toApiError(error).kind === 'cancelled') return;
  if (typeof error === 'object' && error !== null) {
    if (handled.has(error)) return;
    handled.add(error);
  }
  toast.error(getErrorMessage(error));
}
export const showErrorToast = notifyError;

/** Explicit allow-list; backend aliases map to registered RHF paths, including nested paths. */
export function applyFieldErrors<T extends FieldValues>(
  errors: readonly string[],
  setError: UseFormSetError<T>,
  fields?: readonly FieldPath<NoInfer<T>>[],
  aliases: Readonly<Record<string, FieldPath<NoInfer<T>>>> = {},
): void {
  const allowed = fields ? new Set<string>(fields) : null;
  const mapped = new Map<FieldPath<T>, string[]>();
  const general: string[] = [];
  for (const error of errors) {
    const colon = error.indexOf(':');
    const name = colon < 0 ? '' : error.slice(0, colon).trim();
    const field = Object.hasOwn(aliases, name) ? aliases[name] : name;
    const message = colon < 0 ? error : error.slice(colon + 1).trim();
    if ((allowed && !allowed.has(field)) || !field || !message) {
      general.push(error);
      continue;
    }
    const path = field as FieldPath<T>; // Checked against the typed allow-list above when provided.
    mapped.set(path, [...(mapped.get(path) ?? []), message]);
  }
  for (const [field, messages] of mapped)
    setError(field, { type: 'server', message: messages.join('\n') });
  if (general.length) setError('root.server' as FieldPath<T>, { type: 'server', message: general.join('\n') });
}

export function handleFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields?: readonly FieldPath<NoInfer<T>>[],
  aliases?: Readonly<Record<string, FieldPath<NoInfer<T>>>>,
): void {
  const apiError = toApiError(error);
  if (apiError.kind === 'cancelled') return;
  if (apiError.status === 400 || apiError.status === 422) {
    applyFieldErrors<T>(
      apiError.errors.length ? apiError.errors : [apiError.message],
      setError,
      fields,
      aliases,
    );
    if (typeof error === 'object' && error !== null) handled.add(error);
  } else notifyError(error);
}
