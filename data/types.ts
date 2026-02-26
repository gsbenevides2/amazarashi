export interface JSONAlbum {
  romanji: string;
  portuguese: string;
  english: string;
  hiragana: string;
  releaseDate: string;
  musics: {
    musicId: string;
    position: number;
  }[];
}

export interface JSONMusic {
  romanji: string;
  portuguese: string;
  english: string;
  hiragana: string;
  duration: string;
  youtubeVideoClipId?: string;
  youtubeMusicId?: string;
  spotifyId?: string;
  description?: string;
  releaseDate: string;
}
