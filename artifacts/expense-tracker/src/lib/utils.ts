import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeArray<T>(value: readonly T[] | T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}
