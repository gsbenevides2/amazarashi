import { Suspense } from "react";
import { notFound } from "next/navigation";
import ResourceAdmin from "../../../components/admin/ResourceAdmin";
import { specs } from "../../../components/admin/specs";

export const generateStaticParams = () => Object.keys(specs).map((resource) => ({ resource }));

export default function Page({ params }: PageProps<"/admin/[resource]">) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/[resource]">["params"] }) {
  const { resource } = await params;
  if (!specs[resource]) notFound();
  return <ResourceAdmin resource={resource} />;
}
