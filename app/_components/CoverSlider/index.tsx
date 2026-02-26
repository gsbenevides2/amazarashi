"use client";
import CoverItem, { CoverItemProps } from "./CoverItem";
import Icon from "../ui/Icon";
import { useRef } from "react";

/**
 * @title Custom Cover Slider
 */
export interface CoverSliderProps {
  title?: string;
  /**
   * @title Covers
   * @format dynamic-options
   * @options deco-sites/amazarashi/loaders/CoverSlider/records.ts
   */
  covers: CoverItemProps[];
}

/**
 * @title Cover Slider
 */
export default function CoverSlider(props: CoverSliderProps) {
  const { title, covers } = props;
  const carrouselRef = useRef<HTMLUListElement>(null);
  const goNext = () => {
    if (carrouselRef.current) {
      carrouselRef.current.scrollLeft += carrouselRef.current.clientWidth;
    }
  };
  const goPrev = () => {
    if (carrouselRef.current) {
      carrouselRef.current.scrollLeft -= carrouselRef.current.clientWidth;
    }
  };

  return (
    <div className="pl-6 lg:pl-20 xl:pl-36">
      <div className="flex justify-between items-center mb-6 pr-6 lg:pr-20 xl:pr-36">
        {title ? <h2 className="whitespace-break-spaces">{title}</h2> : null}
        <div className="flex gap-3">
          <button
            data-slide="prev"
            aria-label="Previous item"
            className="btn btn-ghost btn-circle btn-info"
            onClick={goPrev}
          >
            <Icon id="ChevronLeft" height={24} width={24} strokeWidth={2} />
          </button>

          <button
            data-slide="next"
            aria-label="Next item"
            className="btn btn-ghost btn-circle btn-info"
            onClick={goNext}
          >
            <Icon id="ChevronRight" height={24} width={24} strokeWidth={2} />
          </button>
        </div>
      </div>
      <ul
        className="gap-3 pr-6 lg:pr-20 xl:pr-36 w-full carousel"
        ref={carrouselRef}
      >
        {covers.map((album, index) => (
          <CoverItem {...album} key={`${album.cover.source}${index}`} />
        ))}
      </ul>
    </div>
  );
}
