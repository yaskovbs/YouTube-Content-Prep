import { Component, ChangeDetectionStrategy, signal, inject, effect, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { YoutubeService } from './services/youtube.service';
import { GeminiService } from './services/gemini.service';
import { SafeUrlPipe } from './safe-url.pipe';
import { ApiKeyInputComponent } from './components/api-key-input/api-key-input.component';
import { GeminiApiKeyInputComponent } from './components/gemini-api-key-input/gemini-api-key-input.component';
import { SearchInputComponent } from './components/shared/search-input.component';
import { ErrorMessageComponent } from './components/shared/error-message.component';

interface VideoWrapper {
  video: any;
  summary: string | null;
  summaryLinks: string[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SafeUrlPipe,
    DatePipe,
    ApiKeyInputComponent,
    GeminiApiKeyInputComponent,
    SearchInputComponent,
    ErrorMessageComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private youtubeService = inject(YoutubeService);
  private geminiService = inject(GeminiService);

  youtubeApiKey = signal('');
  geminiApiKey = signal('');
  youtubeQuery = signal('');
  
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Unified state for all content types
  videoDetails = signal<any | null>(null);
  channelDetails = signal<any | null>(null);
  playlistDetails = signal<any | null>(null);
  channelVideos = signal<VideoWrapper[]>([]);
  
  singleVideoSummary = signal<string | null>(null);
  isGeneratingSummary = signal(false);
  
  copiedLink = signal<string | null>(null);
  copiedFfmpegCommand = signal<string | null>(null);
  copiedAllFfmpegCommands = signal(false);
  downloadingLinks = signal<Record<string, boolean>>({});
  downloadedLinks = signal<Record<string, boolean>>({});
  
  isShareModalOpen = signal(false);
  activeTab = signal<'description' | 'details' | 'tags'>('description');
  
  preferredQuality = signal<string>('Best Available');
  qualityOptions = ['Best Available', '8K', '4K', '1440p', '1080p', '720p'];

  // FFMpeg/yt-dlp command generator state
  ffmpegUrl = signal('');
  ffmpegFilename = signal('');
  ffmpegAudioOnly = signal(false);
  ffmpegQuality = signal('1080');
  ffmpegFormat = signal('mp4');
  generatedCommand = signal<string | null>(null);
  copiedGeneratedCommand = signal(false);
  ffmpegQualityOptions = [
      { value: 'best', label: 'Best' },
      { value: '2160', label: '4K (2160p)' },
      { value: '1440', label: '1440p' },
      { value: '1080', label: '1080p' },
      { value: '720', label: '720p' }
  ];
  ffmpegFormatOptions = ['mp4', 'mkv', 'webm', 'avi'];

  // Direct Download state
  isFetchingDirectLinks = signal(false);
  directDownloadLinks = signal<{url: string; type: string; quality: string}[]>([]);
  directDownloadError = signal<string | null>(null);
  
  // YouTube Category IDs to Names mapping
  private readonly YOUTUBE_CATEGORIES: { [key: string]: string } = {
    '1': 'Film & Animation', '2': 'Autos & Vehicles', '10': 'Music', '15': 'Pets & Animals',
    '17': 'Sports', '18': 'Short Movies', '19': 'Travel & Events', '20': 'Gaming',
    '21': 'Videoblogging', '22': 'People & Blogs', '23': 'Comedy', '24': 'Entertainment',
    '25': 'News & Politics', '26': 'Howto & Style', '27': 'Education', '28': 'Science & Technology',
    '29': 'Nonprofits & Activism', '30': 'Movies', '31': 'Anime/Animation', '32': 'Action/Adventure',
    '33': 'Classics', '34': 'Comedy', '35': 'Documentary', '36': 'Drama', '37': 'Family',
    '38': 'Foreign', '39': 'Horror', '40': 'Sci-Fi/Fantasy', '41': 'Thriller', '42': 'Shorts',
    '43': 'Shows', '44': 'Trailers'
  };

  isApiKeyInvalid = computed(() => {
    const key = this.youtubeApiKey().trim();
    // A basic check for format. YouTube API keys are 39 chars and start with AIza.
    return key !== '' && (!key.startsWith('AIza') || key.length !== 39);
  });

  parsedSingleVideoSummary = computed(() => {
    const summary = this.singleVideoSummary();
    if (!summary) return [];
    return summary.split('\n').filter(line => line.trim().startsWith('https://'));
  });

  hasAnyFictionalLinks = computed(() => {
    return this.channelVideos().some(v => v.summaryLinks.length > 0);
  });

  videoUrl = computed(() => {
    const video = this.videoDetails();
    return video ? `https://www.youtube.com/watch?v=${video.id}` : '';
  });

  shareLinks = computed(() => {
    const video = this.videoDetails();
    if (!video) return null;

    const url = encodeURIComponent(this.videoUrl());
    const title = encodeURIComponent(video.snippet.title);

    return {
      email: `mailto:?subject=${title}&body=Check out this video:%0A${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
  });

  constructor() {
    // Persist API keys in local storage for better UX
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedYouTubeKey = localStorage.getItem('youtubeApiKey');
      if (savedYouTubeKey) {
        this.youtubeApiKey.set(savedYouTubeKey);
      }

      const savedGeminiKey = localStorage.getItem('geminiApiKey');
      if (savedGeminiKey) {
        this.geminiApiKey.set(savedGeminiKey);
        this.geminiService.setApiKey(savedGeminiKey);
      }

      effect(() => {
        localStorage.setItem('youtubeApiKey', this.youtubeApiKey());
      });

      effect(() => {
        const geminiKey = this.geminiApiKey();
        if (geminiKey) {
          this.geminiService.setApiKey(geminiKey);
        }
      });
    }
  }

  private resetState(): void {
    this.videoDetails.set(null);
    this.channelDetails.set(null);
    this.playlistDetails.set(null);
    this.channelVideos.set([]);
    this.singleVideoSummary.set(null);
    this.error.set(null);
    this.activeTab.set('description');
  }

  async fetchDetails() {
    if (!this.youtubeApiKey().trim()) {
      this.error.set('YouTube API key is required to fetch data.');
      return;
    }
    if (this.isApiKeyInvalid()) {
      this.error.set('Invalid YouTube API key format.');
      return;
    }
    if (!this.youtubeQuery().trim()) {
      this.error.set('Please enter a YouTube URL or search query.');
      return;
    }

    this.loading.set(true);
    this.resetState();

    try {
      const query = this.youtubeQuery();
      const apiKey = this.youtubeApiKey();

      const videoId = this.youtubeService.extractVideoId(query);
      const playlistId = this.youtubeService.extractPlaylistId(query);
      const channelIdentifier = this.youtubeService.extractChannelIdentifier(query);

      if (videoId) {
        const details = await this.youtubeService.getVideoDetailsById(videoId, apiKey);
        if (this.youtubeService.parseISO8601Duration(details.contentDetails.duration) <= 60) {
            throw new Error('This tool is for long-form videos only (over 60 seconds).');
        }
        if (!this.youtubeService.isVideoAspectRatio16x9(details)) {
            throw new Error('This tool is for landscape (16:9) videos only.');
        }
        this.videoDetails.set(details);
        if (details.snippet.description) {
            this.activeTab.set('description');
        } else {
            this.activeTab.set('details');
        }
      } else if (playlistId) {
        await this.fetchPlaylistAndVideos(playlistId, apiKey);
      } else if (channelIdentifier) {
        await this.fetchChannelAndVideos(channelIdentifier, apiKey);
      } else {
        // Fallback to search
        const result = await this.youtubeService.searchAndGetFirstResult(query, apiKey);
        if (result.type === 'video') {
            if (this.youtubeService.parseISO8601Duration(result.data.contentDetails.duration) <= 60) {
                throw new Error('Found a short video. This tool is for long-form videos only (over 60 seconds).');
            }
            if (!this.youtubeService.isVideoAspectRatio16x9(result.data)) {
                throw new Error('Found a non-landscape video. This tool is for 16:9 videos only.');
            }
          this.videoDetails.set(result.data);
          if (result.data.snippet.description) {
              this.activeTab.set('description');
          } else {
              this.activeTab.set('details');
          }
        } else if (result.type === 'channel') {
          await this.fetchChannelAndVideos({ type: 'id', value: result.data.id }, apiKey);
        }
      }
    } catch (e: any) {
      this.error.set(this.handleYoutubeError(e));
    } finally {
      this.loading.set(false);
    }
  }
  
  private handleYoutubeError(e: any): string {
    if (e instanceof HttpErrorResponse) {
      const apiErrorMessage = e.error?.error?.message;
      switch (e.status) {
        case 400:
          return `Bad Request: ${apiErrorMessage || 'Please check your inputs and API Key.'}`;
        case 403:
          return `Forbidden: Your API key might be invalid, restricted, or have exceeded its quota. (${apiErrorMessage || ''})`;
        case 404:
          return `Not Found: The requested item could not be found. (${apiErrorMessage || ''})`;
        case 500:
        case 503:
          return 'YouTube service is temporarily unavailable. Please try again later.';
        default:
          return `An unexpected API error occurred (Status: ${e.status}). ${apiErrorMessage || ''}`;
      }
    }
    return e?.message || 'An unknown error occurred while fetching data.';
  }

  private async fetchChannelAndVideos(identifier: { type: 'id' | 'handle'; value: string; }, apiKey: string) {
    const channel = identifier.type === 'id'
      ? await this.youtubeService.getChannelDetailsById(identifier.value, apiKey)
      : await this.youtubeService.getChannelByHandle(identifier.value, apiKey);
    this.channelDetails.set(channel);
    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
    await this.fetchVideosAndSetState(uploadsPlaylistId, apiKey);
  }
  
  private async fetchPlaylistAndVideos(playlistId: string, apiKey: string) {
    const playlist = await this.youtubeService.getPlaylistDetailsById(playlistId, apiKey);
    this.playlistDetails.set(playlist);
    await this.fetchVideosAndSetState(playlistId, apiKey);
  }

  private async fetchVideosAndSetState(playlistId: string, apiKey: string) {
    const videos = await this.youtubeService.getVideosFromPlaylist(playlistId, apiKey);
    this.channelVideos.set(videos.map(v => ({ video: v, summary: null, summaryLinks: [], loading: false, error: null })));
  }

  async generateSingleVideoSummary() {
    const video = this.videoDetails();
    if (!video) return;

    this.isGeneratingSummary.set(true);
    this.singleVideoSummary.set(null);
    this.error.set(null);

    try {
      const summaryText = await this.geminiService.generateSummary(video, this.preferredQuality());
      this.singleVideoSummary.set(summaryText);
    } catch (e: any) {
      this.error.set(e.message || 'Failed to generate summary.');
    } finally {
      this.isGeneratingSummary.set(false);
    }
  }

  async generateAllSummaries() {
    this.loading.set(true);
    this.error.set(null);

    const videoWrappers = this.channelVideos();
    for (let i = 0; i < videoWrappers.length; i++) {
        const wrapper = videoWrappers[i];
        
        this.channelVideos.update(wrappers => {
            wrappers[i].loading = true;
            wrappers[i].error = null;
            return [...wrappers];
        });

        try {
            const summary = await this.geminiService.generateSummary(wrapper.video, this.preferredQuality());
            const links = summary.split('\n').filter(line => line.trim().startsWith('https://'));
            this.channelVideos.update(wrappers => {
                wrappers[i].summary = summary;
                wrappers[i].summaryLinks = links;
                return [...wrappers];
            });
        } catch (e: any) {
            console.error(`Failed to generate summary for "${wrapper.video.snippet.title}":`, e);
            this.channelVideos.update(wrappers => {
                const errorMessage = e.message || 'Could not generate summary.';
                wrappers[i].error = `Failed: ${errorMessage}`;
                return [...wrappers];
            });
        } finally {
            this.channelVideos.update(wrappers => {
                wrappers[i].loading = false;
                return [...wrappers];
            });
            if (i < videoWrappers.length - 1) {
                // Increased delay to be more conservative with Gemini API rate limits.
                await new Promise(resolve => setTimeout(resolve, 20100)); // ~3 requests per minute
            }
        }
    }
    this.loading.set(false);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedLink.set(text);
      setTimeout(() => {
        if (this.copiedLink() === text) {
          this.copiedLink.set(null);
        }
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  private sanitizeFilename(name: string): string {
    // Replace invalid file name characters with an underscore
    return name.replace(/[<>:"/\\|?*]/g, '_');
  }

  copyFfmpegCommand(link: string, videoTitle: string) {
    const sanitizedTitle = this.sanitizeFilename(videoTitle);
    const command = `ffmpeg -i "${link}" -c copy "${sanitizedTitle}.mp4"`;
    navigator.clipboard.writeText(command).then(() => {
      this.copiedFfmpegCommand.set(link);
      setTimeout(() => {
        if (this.copiedFfmpegCommand() === link) {
          this.copiedFfmpegCommand.set(null);
        }
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy FFMpeg command: ', err);
    });
  }

  copyAllFfmpegCommands() {
    const video = this.videoDetails();
    const links = this.parsedSingleVideoSummary();
    if (!video || links.length === 0) return;

    const sanitizedTitle = this.sanitizeFilename(video.snippet.title);
    const commands = links.map((link, index) => {
      // Add an index to prevent filename collisions
      return `ffmpeg -i "${link}" -c copy "${sanitizedTitle}_${index + 1}.mp4"`;
    }).join('\n');

    navigator.clipboard.writeText(commands).then(() => {
      this.copiedAllFfmpegCommands.set(true);
      setTimeout(() => {
        this.copiedAllFfmpegCommands.set(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy all FFMpeg commands: ', err);
    });
  }

  simulateDownload(link: string) {
    // Prevent re-clicking while an action is in progress for this link
    if (this.downloadingLinks()[link] || this.downloadedLinks()[link]) return;

    this.downloadingLinks.update(links => ({ ...links, [link]: true }));

    // Simulate download time
    setTimeout(() => {
      this.downloadingLinks.update(links => {
        const newLinks = { ...links };
        delete newLinks[link];
        return newLinks;
      });
      this.downloadedLinks.update(links => ({ ...links, [link]: true }));

      // Reset the "Downloaded!" state after a few seconds
      setTimeout(() => {
        this.downloadedLinks.update(links => {
          const newLinks = { ...links };
          delete newLinks[link];
          return newLinks;
        });
      }, 2500);
    }, 1500);
  }

  async simulateDownloadAll() {
    const allLinks = this.channelVideos()
        .flatMap(wrapper => wrapper.summaryLinks);

    for (const link of allLinks) {
        if (!this.downloadingLinks()[link] && !this.downloadedLinks()[link]) {
            this.simulateDownload(link);
            // Stagger the start of each download simulation
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
  }

  onFfmpegUrlChange(value: string) {
    this.ffmpegUrl.set(value);
    // Reset states when user types a new URL
    this.directDownloadLinks.set([]);
    this.directDownloadError.set(null);
    this.generatedCommand.set(null);
  }

  async fetchDirectDownloadLinks() {
    const url = this.ffmpegUrl().trim();
    if (!url) {
      this.directDownloadError.set('Please enter a YouTube URL first.');
      return;
    }

    this.isFetchingDirectLinks.set(true);
    this.directDownloadLinks.set([]);
    this.directDownloadError.set(null);

    try {
      const result = await this.youtubeService.getDirectDownloadLinks(url);
      if (result.status === 'stream') {
        this.directDownloadLinks.set([{ url: result.url, quality: 'Best', type: 'Video' }]);
      } else if (result.status === 'picker' && result.picker?.length > 0) {
        this.directDownloadLinks.set(result.picker.map((item: any) => ({
          url: item.url,
          quality: item.quality || 'N/A',
          type: item.type,
        })));
      } else if (result.status === 'error') {
        const errorDetail = result.text || 'The download service could not process the URL.';
        if (typeof errorDetail === 'string') {
          throw new Error(errorDetail);
        } else {
          console.error('Detailed error from download service:', errorDetail);
          throw new Error('The download service returned a complex error. Please check the console for details.');
        }
      } else {
        throw new Error('Received an unexpected response from the download service.');
      }
    } catch (e: any) {
        console.error('Failed to fetch direct download links:', e);
        let errorMessage: string;

        if (e instanceof HttpErrorResponse) {
          const status = e.status;
          const statusText = e.statusText;

          // Handle specific HTTP error codes
          switch (status) {
            case 0:
              errorMessage = 'Network error: Unable to connect to the download service. This might be due to CORS restrictions, network blocking, or the service being unavailable.';
              break;
            case 403:
              errorMessage = 'Access forbidden: The download service is blocking requests from this application.';
              break;
            case 429:
              errorMessage = 'Too many requests: The download service is rate-limiting requests. Please try again later.';
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage = 'Service unavailable: The download service is currently experiencing issues. Please try again later.';
              break;
            default:
              errorMessage = `Download service error (${status}${statusText ? ` ${statusText}` : ''}): The third-party download service encountered an issue.`;
          }

          // Add helpful suggestions
          errorMessage += '\n\n💡 Suggestions:\n• Use the yt-dlp command generator below instead\n• Install yt-dlp locally for direct downloads\n• Check if your network blocks external download services';
        } else if (e instanceof Error) {
          // Handle specific error messages
          if (e.message.includes('CORS') || e.message.includes('cross-origin')) {
            errorMessage = 'CORS error: The download service doesn\'t allow requests from web browsers. Use the yt-dlp command generator below for local downloads.';
          } else if (e.message.includes('network') || e.message.includes('connection')) {
            errorMessage = 'Network error: Unable to reach the download service. Your network might be blocking it. Try using the yt-dlp command generator instead.';
          } else {
            errorMessage = `Download service error: ${e.message}\n\n💡 Try using the yt-dlp command generator below for reliable downloads.`;
          }
        } else {
          errorMessage = 'Unknown error occurred while trying to get download links. Please try using the yt-dlp command generator below instead.';
        }

        this.directDownloadError.set(errorMessage);
    } finally {
      this.isFetchingDirectLinks.set(false);
    }
  }

  generateYtdlpCommand() {
    const url = this.ffmpegUrl().trim();
    if (!url) {
      this.generatedCommand.set(null);
      return;
    }
    const quality = this.ffmpegQuality();
    const format = this.ffmpegFormat();
    const audioOnly = this.ffmpegAudioOnly();
    const filename = this.ffmpegFilename().trim();

    let command = 'yt-dlp';

    if (audioOnly) {
      // Command for audio only download as mp3
      command += ` -f bestaudio -x --audio-format mp3`;
    } else {
      let formatSelector = 'bv*+ba/b';
      if (quality !== 'best') {
        formatSelector = `bv*[height<=${quality}]+ba/b[height<=${quality}]`;
      }
      command += ` -f "${formatSelector}" --merge-output-format ${format}`;
    }

    // Add output filename template
    if (filename) {
        const finalFilename = filename.includes('.') ? filename : `${filename}.${audioOnly ? 'mp3' : format}`;
        command += ` -o "${finalFilename}"`;
    } else {
        command += ` -o "%(title)s.%(ext)s"`;
    }

    command += ` "${url}"`;
    this.generatedCommand.set(command);
  }

  copyGeneratedCommand() {
    const command = this.generatedCommand();
    if (!command) return;

    navigator.clipboard.writeText(command).then(() => {
      this.copiedGeneratedCommand.set(true);
      setTimeout(() => {
        this.copiedGeneratedCommand.set(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy command: ', err);
    });
  }

  getEmbedUrl(videoId: string): string {
    const url = `https://www.youtube.com/embed/${videoId}`;
    return `${url}?origin=${window.location.origin}`;
  }

  getCategoryName(categoryId: string): string {
    return this.YOUTUBE_CATEGORIES[categoryId] || 'Unknown';
  }

  formatNumber(numStr: string): string {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(num);
  }

  formatDuration(isoDuration: string): string {
    const seconds = this.youtubeService.parseISO8601Duration(isoDuration);
     if (seconds === 0) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
        h > 0 ? h + ':' : '',
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join('');
  }
}
