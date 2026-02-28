"use client";

import { useCallback, useState } from "react";
import Icon from "../ui/Icon";
import { MusicDataProps } from "./types";

type Tab = "description" | "lyrics" | "moreInfo";

/** @title Music Data */
function MusicData(props: MusicDataProps) {
  const {
    data: { description, youtubeVideoClipId, spotifyId, youtubeMusicId },
  } = props;

  const [activeTab, setActiveTab] = useState<Tab>("description");

  const handleTabClick = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const lyricsLines = props.lyrics[0]?.lines ?? [];

  return (
    <>
      <div className="flex lg:flex-row flex-col-reverse gap-8 lg:gap-10 px-6 lg:px-20 xl:px-36 py-6 lg:py-6 xl:py-12">
        <div className="lg:w-1/2 h-full lg:text-left text-center">
          <ul className="flex justify-around mb-6">
            <li>
              <a
                className={`animated cursor-pointer ${activeTab === "description" ? "before:w-full!" : ""}`}
                onClick={() => handleTabClick("description")}
              >
                Descrição
              </a>
            </li>
            <li>
              <a
                className={`animated cursor-pointer ${activeTab === "lyrics" ? "before:w-full!" : ""}`}
                onClick={() => handleTabClick("lyrics")}
              >
                Letras
              </a>
            </li>
            <li>
              <a
                className={`animated cursor-pointer ${activeTab === "moreInfo" ? "before:w-full!" : ""}`}
                onClick={() => handleTabClick("moreInfo")}
              >
                Mais Informações
              </a>
            </li>
          </ul>
          <div className={activeTab !== "description" ? "hidden" : ""}>
            <p className="text-justify">{description}</p>
          </div>
          <div className={activeTab !== "lyrics" ? "hidden" : ""}>
            <div className="flex justify-center mb-4">
              <a
                href={`/lyrics-sync/${props.data.id}`}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md text-white transition-colors"
              >
                <Icon id="view" size={20} strokeWidth={2} />
                Ver sincronizado
              </a>
            </div>
            <p>
              {lyricsLines.map((line, index) => {
                const hiragana = line.texts.find(
                  (text) => text.languageId === "hiragana",
                );
                const romanji = line.texts.find(
                  (text) => text.languageId === "romanji",
                );
                const portuguese = line.texts.find(
                  (text) => text.languageId === "portuguese",
                );
                return (
                  <p className="mb-6" key={index}>
                    <span className="block font-medium text-gray-200 text-lg">
                      {hiragana?.text}
                    </span>
                    <span className="block text-gray-400 text-sm italic">
                      {romanji?.text}
                    </span>
                    <span className="block text-gray-300 text-base">
                      {portuguese?.text}
                    </span>
                  </p>
                );
              })}
            </p>
          </div>
          <div className={activeTab !== "moreInfo" ? "hidden" : ""}>
            <h5 className="mb-5">Veja também no:</h5>
            <div className="flex flex-col gap-2">
              {spotifyId && (
                <a
                  target="_blank"
                  href={`https://open.spotify.com/tracklea/${spotifyId}`}
                  className="flex justify-center items-center gap-2 w-fit hover:font-semibold hover:text-white cursor-pointer"
                >
                  <Icon id="Spotify" size={24} strokeWidth={2} />
                  <span>Ouvir no Spotify</span>
                </a>
              )}
              {youtubeMusicId && (
                <a
                  target="_blank"
                  href={`https://music.youtube.com/watch?v=${youtubeMusicId}`}
                  className="flex justify-center items-center gap-2 w-fit hover:font-semibold hover:text-white cursor-pointer"
                >
                  <Icon id="YoutubeMusic" size={24} strokeWidth={2} />
                  <span>Ouvir no Youtube Music</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="lg:top-16 lg:sticky lg:w-1/2 lg:h-full lg:min-h-125 lg:max-h-125">
          <iframe
            className="aspect-video"
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeVideoClipId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </>
  );
}

export default MusicData;
