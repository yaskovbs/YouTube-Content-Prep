import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class YoutubeService {
  private http = inject(HttpClient);
  private readonly YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

  extractVideoId(urlOrQuery: string): string | null {
    if (!urlOrQuery) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrQuery.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    const shortRegExp = /youtu\.be\/([^#\&\?]{11})/;
    const shortMatch = urlOrQuery.match(shortRegExp);
    if (shortMatch && shortMatch[1]) {
        return shortMatch[1];
    }
    return null;
  }

  extractPlaylistId(urlOrQuery: string): string | null {
    if (!urlOrQuery) return null;
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = urlOrQuery.match(regExp);
    return (match && match[1]) ? match[1] : null;
  }

  extractChannelIdentifier(urlOrQuery: string): { type: 'id' | 'handle', value: string } | null {
    if (!urlOrQuery) return null;
    const idRegex = /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;
    const idMatch = urlOrQuery.match(idRegex);
    if (idMatch && idMatch[1]) {
        return { type: 'id', value: idMatch[1] };
    }
    const handleRegex = /youtube\.com\/@([a-zA-Z0-9_.-]+)/;
    const handleMatch = urlOrQuery.match(handleRegex);
    if (handleMatch && handleMatch[1]) {
        return { type: 'handle', value: handleMatch[1] };
    }
    return null;
  }

  async searchAndGetFirstResult(query: string, apiKey: string): Promise<{type: 'video' | 'channel', data: any}> {
    const searchParams = new HttpParams()
      .set('part', 'snippet')
      .set('q', query)
      .set('maxResults', '1')
      .set('key', apiKey);
    
    const searchResult = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/search`, { params: searchParams }));
    
    if (searchResult?.items?.length > 0) {
      const firstItem = searchResult.items[0];
      if (firstItem.id.kind === 'youtube#video') {
        const videoDetails = await this.getVideoDetailsById(firstItem.id.videoId, apiKey);
        return { type: 'video', data: videoDetails };
      } else if (firstItem.id.kind === 'youtube#channel') {
        const channelDetails = await this.getChannelDetailsById(firstItem.id.channelId, apiKey);
        return { type: 'channel', data: channelDetails };
      }
    }
    
    throw new Error('No results found for your search query.');
  }

  async getVideoDetailsById(videoId: string, apiKey: string): Promise<any> {
    const params = new HttpParams()
      .set('part', 'snippet,statistics,contentDetails')
      .set('id', videoId)
      .set('key', apiKey);

    const result = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/videos`, { params }));
    
    if (result?.items?.length > 0) {
      return result.items[0];
    } else {
      throw new Error('Video not found or invalid ID.');
    }
  }

  async getChannelDetailsById(channelId: string, apiKey: string): Promise<any> {
    const params = new HttpParams()
      .set('part', 'snippet,statistics,contentDetails,brandingSettings')
      .set('id', channelId)
      .set('key', apiKey);
    const result = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/channels`, { params }));
    if (result?.items?.length > 0) {
      return result.items[0];
    }
    throw new Error('Channel not found or invalid ID.');
  }
  
  async getPlaylistDetailsById(playlistId: string, apiKey: string): Promise<any> {
    const params = new HttpParams()
      .set('part', 'snippet')
      .set('id', playlistId)
      .set('key', apiKey);
    const result = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/playlists`, { params }));
    if (result?.items?.length > 0) {
      return result.items[0];
    }
    throw new Error('Playlist not found or invalid ID.');
  }

  async getChannelByHandle(handle: string, apiKey: string): Promise<any> {
    const params = new HttpParams()
      .set('part', 'id')
      .set('forHandle', handle)
      .set('key', apiKey);
    const result = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/channels`, { params }));
     if (result?.items?.length > 0) {
      return this.getChannelDetailsById(result.items[0].id, apiKey);
    }
    throw new Error(`Channel with handle @${handle} not found.`);
  }
  
  public parseISO8601Duration(duration: string): number {
    if (!duration) return 0;
    // This regex handles PT#H#M#S format.
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);
  
    if (!matches) return 0;
  
    const hours = matches[1] ? parseInt(matches[1], 10) : 0;
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
  
    return hours * 3600 + minutes * 60 + seconds;
  }

  public isVideoAspectRatio16x9(video: any): boolean {
    if (!video?.snippet?.thumbnails?.medium) {
      return true; // Default to true if thumbnail info is missing
    }
    const { width, height } = video.snippet.thumbnails.medium;
    if (!width || !height || width === 0 || height === 0) return true;
    const aspectRatio = width / height;
    // Check if the aspect ratio is approximately 16:9 (1.777...)
    return Math.abs(aspectRatio - (16 / 9)) < 0.02;
  }

  async getVideosFromPlaylist(playlistId: string, apiKey: string): Promise<any[]> {
    let allVideoIds: string[] = [];
    let nextPageToken: string | undefined = undefined;

    // 1. Fetch all video IDs from the playlist using pagination
    do {
      let playlistParams = new HttpParams()
        .set('part', 'snippet')
        .set('playlistId', playlistId)
        .set('maxResults', '50') // Max allowed per page
        .set('key', apiKey);
      
      if (nextPageToken) {
        playlistParams = playlistParams.set('pageToken', nextPageToken);
      }

      const playlistItemsResult = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/playlistItems`, { params: playlistParams }));
      
      if (playlistItemsResult?.items?.length) {
        const ids = playlistItemsResult.items.map((item: any) => item.snippet.resourceId.videoId);
        allVideoIds.push(...ids);
      }
      
      nextPageToken = playlistItemsResult.nextPageToken;

    } while (nextPageToken);

    if (allVideoIds.length === 0) {
      return [];
    }

    // 2. Fetch video details in batches of 50
    const allVideos: any[] = [];
    for (let i = 0; i < allVideoIds.length; i += 50) {
      const videoIdsBatch = allVideoIds.slice(i, i + 50);
      const videoIdsString = videoIdsBatch.join(',');

      const videoParams = new HttpParams()
        .set('part', 'snippet,statistics,contentDetails')
        .set('id', videoIdsString)
        .set('key', apiKey);
      
      const videosResult = await firstValueFrom(this.http.get<any>(`${this.YOUTUBE_API_URL}/videos`, { params: videoParams }));
      
      if (videosResult?.items?.length) {
        allVideos.push(...videosResult.items);
      }
    }

    // Filter for long, 16:9 videos
    const filteredVideos = allVideos.filter(video => 
        this.parseISO8601Duration(video.contentDetails.duration) > 60 && this.isVideoAspectRatio16x9(video)
    );

    // 3. Order the full video details based on the original playlist order
    const videoMap = new Map(filteredVideos.map((video: any) => [video.id, video]));
    const orderedVideos = allVideoIds
        .map(id => videoMap.get(id))
        .filter((v): v is any => v !== undefined);

    return orderedVideos;
  }

  async getDirectDownloadLinks(url: string): Promise<any> {
    const COBALT_API_URL = 'https://co.wuk.sh/api/json';
    const body = {
      url: url.trim(),
      vQuality: "max", // Let cobalt decide the best quality available
      isAudioOnly: false,
    };
    return firstValueFrom(this.http.post<any>(COBALT_API_URL, body));
  }
}