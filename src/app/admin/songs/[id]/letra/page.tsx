import { Suspense } from "react";
import LyricsSync from "../../../../../components/admin/LyricsSync";

export default function Page({ params }: PageProps<"/admin/songs/[id]/letra">) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/songs/[id]/letra">["params"] }) {
  const { id } = await params;
  return <LyricsSync id={Number(id)} />;
}
