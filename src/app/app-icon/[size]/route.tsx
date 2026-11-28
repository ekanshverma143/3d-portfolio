import { ImageResponse } from "next/og";
import { AppMark } from "@/components/app-mark";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  return new ImageResponse(<AppMark size={n} />, { width: n, height: n });
}
