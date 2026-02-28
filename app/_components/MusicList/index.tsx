import Icon from "@/app/_components/ui/Icon";

/** @title {{id}} */
export interface MusicListItem {
  /**
   * @title ID
   * @description Unique identifier for the music
   */
  id: string;
  /**
   * @title Position
   * @description Position of the music in the album
   * @minimum 1
   */
  position: number;
  /**
   * @title Name
   * @description Name of the music
   */
  name: string;
  /**
   * @title Hiragana Name
   * @description Name of the music in hiragana
   */
  duration: number;
  /**
   * @title YouTube Music ID
   * @description ID of the music on YouTube Music
   * @pattern ^[a-zA-Z0-9_-]{11}$
   * @maxLength 11
   * @minLength 11
   */
  youtubeMusicId?: string;
  /**
   * @title Spotify ID
   * @description ID of the music on Spotify
   * @pattern ^[a-zA-Z0-9]{22}$
   * @maxLength 22
   * @minLength 22
   */
  spotifyId?: string;

  /**
   * @title Music Link
   * @description Link to the music
   * @format uri
   */
  url: string;
}

export interface MusicListProps {
  /**
   * @title Musics
   * @description List of musics to be displayed
   */
  musics: MusicListItem[];
}

function Item(props: MusicListItem) {
  const transformDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const makeSpotifyLink = (id: string) =>
    `https://open.spotify.com/track/${id}`;
  const makeYoutubeMusicLink = (id: string) =>
    `https://music.youtube.com/watch?v=${id}`;

  return (
    <li className="flex items-center">
      <p
        className="flex justify-center items-center bg-white mr-4 lg:ml-4 rounded-full w-6 h-6 font-semibold text-black text-xs tooltip"
        data-tip="Posição da Faixa"
      >
        {props.position}
      </p>
      <a className="flex-1" href={props.url}>
        <p className="flex flex-col items-start gap-1">
          <strong className="block lg:font-medium">{props.name}</strong>
          <span
            className="hidden lg:block before:font-semibold tooltip"
            data-tip="Tempo da Música"
          >
            {transformDuration(props.duration)}
          </span>
        </p>
      </a>
      <div className="hidden lg:flex flex-col gap-1 text-white">
        {props.spotifyId && (
          <a
            className="before:font-semibold tooltip"
            data-tip="Abrir no Spotify"
            href={makeSpotifyLink(props.spotifyId)}
            target="_blank"
          >
            <Icon id="Spotify" size={24} />
          </a>
        )}
        {props.youtubeMusicId && (
          <a
            className="before:font-semibold tooltip"
            data-tip="Abrir no Youtube Music"
            href={makeYoutubeMusicLink(props.youtubeMusicId)}
            target="_blank"
          >
            <Icon id="YoutubeMusic" size={24} />
          </a>
        )}
      </div>
    </li>
  );
}

/**@title Music List */
export default function MusicList(props: MusicListProps) {
  return (
    <div className="px-6 lg:px-20 xl:px-36">
      <div>
        <h3 className="mb-4">Lista de Músicas</h3>
      </div>
      {props.musics.length === 0 ? (
        <p>Nenhuma música encontrada</p>
      ) : (
        <ul>
          {props.musics.map((music) => (
            <Item key={music.id} {...music} />
          ))}
        </ul>
      )}
    </div>
  );
}
