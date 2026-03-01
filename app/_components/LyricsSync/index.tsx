"use client";
import { useState, useEffect } from "react";
import { Lyrics } from "../MusicData/types";
import { MusicInfoData } from "../MusicInfo";
import BackButton from "../ui/BackButton";
import Icon from "../ui/Icon";

export interface LyricsLanguage {
  id: string;
  name: string;
}

interface LyricsSyncProps {
  data: {
    musicInfo: MusicInfoData;
    lyrics: Lyrics[];
    languages: LyricsLanguage[];
  };
}

interface YouTubePlayer {
  getCurrentTime: () => number;
  // Add other methods you need from the YouTube Player API
}

interface YoutubePlayerOptions {
  videoId: string;
  events: {
    onReady: () => void;
    // Add other event handlers if needed
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: YoutubePlayerOptions,
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function LyricsSync({ data }: LyricsSyncProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const parseTimeToSeconds = (timeStr: string) => {
      const [hours, minutes, seconds] = timeStr.split(":").map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    };
    // Initialize YouTube Player when API is ready
    window.onYouTubeIframeAPIReady = () => {
      let currentLineInternal = 0;
      const newPlayer = new window.YT.Player("player", {
        videoId: data.musicInfo.youtubeMusicId || "",
        events: {
          onReady: () => {
            setInterval(() => {
              const time = newPlayer.getCurrentTime();

              // Find current line based on time
              const currentLine = data.lyrics[0]?.lines.findIndex((line) => {
                const start = parseTimeToSeconds(line.start);
                const end = parseTimeToSeconds(line.end);
                return time >= start && time < end;
              });

              if (currentLineInternal !== currentLine) {
                if (currentLine !== -1) {
                  setCurrentLineIndex(currentLine);
                  currentLineInternal = currentLine;
                  // Scroll to current line
                  const currentLineElement = document.getElementById(
                    `line-${currentLine}`,
                  );
                  if (currentLineElement && !isMobile) {
                    const windowHeight = globalThis.innerHeight;
                    const lineTop =
                      currentLineElement.getBoundingClientRect().top +
                      globalThis.scrollY;
                    const lineHeight = currentLineElement.clientHeight;

                    // Scroll to position the current line in the middle of the window
                    globalThis.scrollTo({
                      top: lineTop - windowHeight / 2 + lineHeight / 2,
                      behavior: "smooth",
                    });
                  } else if (currentLineElement && isMobile) {
                    console.log(currentLineElement, isMobile);
                    currentLineElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                      inline: "center",
                    });
                  }
                }
              }
            }, 100);
          },
        },
      });
    };

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }, [data.lyrics, data.musicInfo.youtubeMusicId]);

  return (
    <>
      {/* Fixed Header */}
      <div className="top-0 right-0 left-0 z-50 fixed bg-[#121212] shadow-lg px-6 lg:px-20 xl:px-36 py-4 h-22 lg:h-[unset]">
        <div className="flex justify-between items-center gap-4 mx-auto max-w-7xl">
          <BackButton className="gap-2 w-fit text-white cursor-pointer flex! animated">
            <Icon id="ArrowBack" size={24} strokeWidth={2} />
            <span>Voltar</span>
          </BackButton>
          <h1 className="font-bold text-white text-xl">
            {data.musicInfo.romanji}
          </h1>
        </div>
      </div>

      {/* Main Content with padding-top to account for fixed header */}
      <div className="mt-22 lg:mt-[unset] p-4 lg:p-8 lg:pt-16 lg:min-h-screen max-h-[calc(100vh-88px)] lg:max-h-[unset]">
        <div className="mx-auto max-w-7xl">
          <div className="flex lg:flex-row flex-col gap-8">
            {/* Lyrics Section */}
            <div
              className="lg:w-1/2 max-h-[50vh] lg:max-h-[unset] overflow-x-hidden overflow-y-auto"
              id="lyrics-container"
            >
              <div className="space-y-6">
                {data.lyrics[0]?.lines.map((line, index) => {
                  const isCurrentLine = index === currentLineIndex;
                  const hiragana = line.texts.find(
                    (t) => t.languageId === "hiragana",
                  );
                  const romanji = line.texts.find(
                    (t) => t.languageId === "romanji",
                  );
                  const portuguese = line.texts.find(
                    (t) => t.languageId === "portuguese",
                  );

                  return (
                    <div
                      id={`line-${index}`}
                      key={index}
                      className={`transition-all duration-300 ${
                        isCurrentLine ? "text-white " : "text-gray-400"
                      }`}
                    >
                      <p
                        className={`${
                          isCurrentLine ? "text-xl font-bold" : "text-base"
                        } mb-1`}
                      >
                        {hiragana?.text}
                      </p>
                      <p
                        className={`${
                          isCurrentLine ? "text-lg font-bold" : "text-sm"
                        } italic mb-1`}
                      >
                        {romanji?.text}
                      </p>
                      <p
                        className={`${
                          isCurrentLine ? "text-lg font-bold" : "text-sm"
                        }`}
                      >
                        {portuguese?.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Section */}
            <div className="lg:top-17.5 lg:sticky lg:w-1/2 h-fit">
              {/* Adjusted top value to account for header */}
              <div className="aspect-video">
                <div id="player" className="w-full h-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
