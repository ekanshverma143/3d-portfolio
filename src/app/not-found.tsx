import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col justify-center pt-32 pb-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-5 text-4xl font-medium tracking-[-0.035em] sm:text-6xl">
        This page took a <span className="font-serif italic">wrong edge</span>.
      </h1>
      <p className="mt-5 max-w-lg text-lg text-muted">The link may be old, or the page moved when the site was rebuilt.</p>
      <div className="mt-9 flex flex-wrap gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/blog" variant="ghost">
          Read the writing
        </ButtonLink>
      </div>
    </Container>
  );
}
