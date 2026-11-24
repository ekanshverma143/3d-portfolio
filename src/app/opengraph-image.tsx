import { ogImage, ogSize } from "@/components/og";
import { site } from "@/content/site";

export const alt = `${site.name}, software engineer building AI systems`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    eyebrow: "Software engineer, AI systems",
    title: "Ekansh Verma builds AI systems that do real work.",
    footer: "ekanshverma.site",
  });
}
