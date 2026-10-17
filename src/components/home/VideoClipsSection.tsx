import Reveal from "../Reveal";
import SectionTitle from "./SectionTitle";
import VideoCarousel from "./VideoCarousel";

export default function VideoClipsSection({ clips }: { clips: React.ComponentProps<typeof VideoCarousel>["clips"] }) {
  return (
    <Reveal as="section" id="videoclipes" aria-labelledby="videos-title" className="mt-10 overflow-x-clip pt-4 md:mt-16 md:pt-6">
      <div className="relative mx-auto max-w-300">
        <SectionTitle id="videos-title" className="mb-6 px-6 md:mb-10 xl:px-0">Vídeoclipes</SectionTitle>
        <VideoCarousel clips={clips} />
      </div>
    </Reveal>
  );
}
