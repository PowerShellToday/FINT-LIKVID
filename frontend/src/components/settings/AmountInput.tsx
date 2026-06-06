import { useState } from "react";
import { Input } from "@/components/ui/input";

interface AmountInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  id?: string;
}

export function AmountInput({ value, onChange, placeholder = "0", id }: AmountInputProps) {
  const [focused, setFocused] = useState(false);

  const display = focused
    ? value === "" ? "" : String(value)
    : value === "" ? "" : `${Number(value).toLocaleString("sv-SE")} kr`;

  return (
    <Input
      id={id}
      type={focused ? "number" : "text"}
      value={display}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? "" : parseFloat(v));
      }}
    />
  );
}
