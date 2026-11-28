import { logoDataUri } from "@/content/logo";

export function AppMark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, display: "flex", background: "#08090b" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoDataUri()} width={size} height={size} alt="" />
    </div>
  );
}
