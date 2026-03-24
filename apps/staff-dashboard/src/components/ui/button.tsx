"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function getVariantClasses(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return "bg-black text-white hover:opacity-90";
    case "secondary":
      return "bg-gray-100 text-gray-900 hover:bg-gray-200";
    case "outline":
      return "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50";
    case "danger":
      return "bg-red-600 text-white hover:bg-red-700";
    default:
      return "bg-black text-white hover:opacity-90";
  }
}

function getSizeClasses(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "px-3 py-2 text-sm";
    case "md":
    default:
      return "px-4 py-2 text-sm";
  }
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-xl transition disabled:cursor-not-allowed disabled:opacity-60",
        getVariantClasses(variant),
        getSizeClasses(size),
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
