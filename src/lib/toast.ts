import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
};

/** Appends a toast message/type to a redirect target so the destination page can surface it. */
export function withToast(path: string, message: string, type: "success" | "error" = "success") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}toast=${encodeURIComponent(message)}&toastType=${type}`;
}
