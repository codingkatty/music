// api.js

// Spotify API Configuration
const CLIENT_ID = 'f9947aa68051427282c99c3f165e35f3'; // Get this from Spotify Developer Dashboard
const CLIENT_SECRET = 'b3ab18efe5444917b39acea2a0f9f722'; // Get this from Spotify Developer Dashboard
const REDIRECT_URI = 'http://127.0.0.1:5500/testing/discover.html';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-library-modify'
].join(' ');

// Add these constants at the top
const FEATURED_PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M'; // Today's Top Hits
const DEFAULT_ALBUM_ART = 'https://i.scdn.co/image/ab67616d0000b273cbd4e147b2254948b2aa4ad5';

// Default playlists
const defaultPlaylists = {
  'Liked songs': [
    { id: '3n3Ppam7vgaVa1iaRUc9Lp', name: 'Blinding Lights', artists: ['The Weeknd'], album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2730d5f3b5f5b5f5b5f5b5f5b5f' }] } },
    { id: '7qiZfU4dY1lWllzX7mPBI3', name: 'Shape of You', artists: ['Ed Sheeran'], album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2733b5f5b5f5b5f5b5f5b5f' }] } }
  ],
  'LISA': [
    { id: '1r4hJ1h58CWwUQe3MxPuau', name: 'LALISA', artists: ['LISA'], album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734b5f5b5f5b5f5b5f5b5f' }] } }
  ],
  'Taylor Swift': [
    { id: '2b8fOow8UzyDFAE27YhOZM', name: 'Love Story', artists: ['Taylor Swift'], album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2735b5f5b5f5b5f5b5f5b5f' }] } }
  ],
  'Stray Kids': [
    { id: '3n3Ppam7vgaVa1iaRUc9Lp', name: 'God’s Menu', artists: ['Stray Kids'], album: { images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2736b5f5b5f5b5f5b5f5b5f' }] } }
  ],
  'Recently Played': [],
  'Discover Weekly': []
};

// Initialize Spotify API
class SpotifyAPI {
  constructor() {
    this.accessToken = null;
    this.player = null;
    this.currentPlaylist = null;
    this.playlists = this.loadPlaylists() || defaultPlaylists;
    this.init();
    this.loadDefaultView(); // Add this line
  }

  init() {
    // Check if we're coming back from Spotify auth
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      this.getAccessToken(code);
    } else {
      this.redirectToSpotifyAuth();
    }
  }

  redirectToSpotifyAuth() {
    const url = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=${SCOPES}`;
    window.location.href = url;
  }

  async getAccessToken(code) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', REDIRECT_URI);
      params.append('client_id', CLIENT_ID);
      params.append('client_secret', CLIENT_SECRET);

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error_description);
      }
      
      this.accessToken = data.access_token;
      console.log('Access Token:', this.accessToken); // Log access token
      await this.initPlayer();
    } catch (error) {
      console.error('Error getting access token:', error);
      setTimeout(() => this.redirectToSpotifyAuth(), 3000); // Retry auth after 3s
    }
  }

  async initPlayer() {
    // Wait for SDK to be ready
    if (!window.spotifySDKReady) {
      await new Promise(resolve => {
        const checkSDK = setInterval(() => {
          if (window.spotifySDKReady) {
            clearInterval(checkSDK);
            resolve();
          }
        }, 100);
      });
    }

    this.player = new Spotify.Player({
      name: 'Daily Dose of Music Player',
      getOAuthToken: cb => cb(this.accessToken)
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
      this.redirectToSpotifyAuth();
    });

    // Connect player
    const connected = await this.player.connect();
    if (connected) {
      console.log('Player connected'); // Log player connection
      this.setupDragAndDrop();
    }
  }

  setupDragAndDrop() {
    const albumArts = document.querySelectorAll('.album-art');
    const cdPlayer = document.querySelector('.cd-player');

    albumArts.forEach(album => {
      album.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', album.dataset.trackId);
      });
    });

    cdPlayer.addEventListener('dragover', (e) => {
      e.preventDefault();
      cdPlayer.classList.add('drag-over');
    });

    cdPlayer.addEventListener('dragleave', () => {
      cdPlayer.classList.remove('drag-over');
    });

    cdPlayer.addEventListener('drop', async (e) => {
      e.preventDefault();
      cdPlayer.classList.remove('drag-over');
      const trackId = e.dataTransfer.getData('text/plain');
      await this.playTrack(trackId);
    });
  }

  async searchTracks(query) {
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const data = await response.json();
      console.log('Search Results:', data.tracks.items); // Log search results
      this.displaySearchResults(data.tracks.items);
    } catch (error) {
      console.error('Error searching tracks:', error);
    }
  }

  async loadDefaultView() {
    const albumGrid = document.querySelector('.album-grid');
    albumGrid.innerHTML = '<div class="loading">Loading...</div>';

    try {
      // First try to load featured playlist
      const response = await fetch(`https://api.spotify.com/v1/browse/featured-playlists`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      const data = await response.json();
      if (data.playlists && data.playlists.items.length > 0) {
        const featuredPlaylist = data.playlists.items[0];
        const tracksResponse = await fetch(featuredPlaylist.tracks.href, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
        const tracksData = await tracksResponse.json();
        this.displaySearchResults(tracksData.items.map(item => item.track));
      } else {
        // Fallback to default playlists if featured playlist fails
        const defaultTracks = Object.values(defaultPlaylists)
          .flat()
          .slice(0, 8);
        this.displaySearchResults(defaultTracks);
      }
    } catch (error) {
      console.error('Error loading default view:', error);
      // Fallback to default playlists
      const defaultTracks = Object.values(defaultPlaylists)
        .flat()
        .slice(0, 8);
      this.displaySearchResults(defaultTracks);
    }
  }

  displaySearchResults(tracks) {
    const albumGrid = document.querySelector('.album-grid');
    albumGrid.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      albumGrid.innerHTML = '<div class="loading">No tracks found</div>';
      return;
    }

    tracks.slice(0, 8).forEach(track => {
      if (!track) return; // Skip if track is undefined

      const albumCard = document.createElement('div');
      albumCard.className = 'album-card';
      albumCard.innerHTML = `
        <div class="album-art draggable" 
             draggable="true" 
             data-track-id="${track.id}"
             style="background-image: url('${track.album?.images[0]?.url || DEFAULT_ALBUM_ART}')">
          <div class="album-overlay">
            <button class="add-to-playlist" data-track-id="${track.id}">+</button>
          </div>
        </div>
        <div class="track-info">
          <div class="track-title">${track.name}</div>
          <div class="track-artist">${track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}</div>
        </div>
      `;
      albumGrid.appendChild(albumCard);
    });

    this.setupDragAndDrop();
    this.setupAddToPlaylist();
  }

  setupAddToPlaylist() {
    document.querySelectorAll('.add-to-playlist').forEach(button => {
      button.addEventListener('click', (e) => {
        const trackId = e.target.dataset.trackId;
        const track = this.findTrackById(trackId);
        if (track && this.currentPlaylist) {
          this.playlists[this.currentPlaylist].push(track);
          this.savePlaylists();
          this.updatePlaylistCount();
        }
      });
    });
  }

  findTrackById(trackId) {
    // Search through all playlists
    for (const playlist of Object.values(this.playlists)) {
      const track = playlist.find(t => t.id === trackId);
      if (track) return track;
    }
    return null;
  }

  updatePlaylistCount() {
    document.querySelectorAll('.playlist-item').forEach(item => {
      const playlistName = item.querySelector('.playlist-info div').textContent;
      const count = this.playlists[playlistName]?.length || 0;
      const subtitle = item.querySelector('.subtitle');
      if (subtitle) {
        subtitle.textContent = `Playlist • ${count} songs`;
      }
    });
  }

  displayPlaylist(playlistName) {
    this.currentPlaylist = playlistName;
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.classList.remove('active');
      if (item.querySelector('.playlist-info div').textContent === playlistName) {
        item.classList.add('active');
      }
    });
    this.displaySearchResults(this.playlists[playlistName]);
  }

  async playTrack(trackId) {
    try {
      if (!this.player) {
        console.error('Player is not initialized');
        return;
      }
      await this.player.play({
        uris: [`spotify:track:${trackId}`]
      });
      document.querySelector('.cd-player').classList.add('playing');
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }

  loadPlaylists() {
    return JSON.parse(localStorage.getItem('playlists'));
  }

  savePlaylists() {
    localStorage.setItem('playlists', JSON.stringify(this.playlists));
  }

  // Update event listeners for playlist items
  setupPlaylistItems() {
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const playlistName = item.querySelector('.playlist-info div').textContent.trim();
        this.displayPlaylist(playlistName);
      });
    });
  }
}

// Initialize the API when the page loads
const spotifyAPI = new SpotifyAPI();

// Add search functionality
const searchInput = document.querySelector('.song-search input');
searchInput.addEventListener('input', (e) => {
  if (e.target.value.length > 2) {
    spotifyAPI.searchTracks(e.target.value);
  }
});

const searchButton = document.querySelector('.search-button');
searchButton.addEventListener('click', () => {
  const query = document.querySelector('.song-search input').value;
  if (query.length > 2) {
    spotifyAPI.searchTracks(query);
  }
});

// Add playlist functionality
const playlistItems = document.querySelectorAll('.playlist-item');
playlistItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const playlistName = item.querySelector('.playlist-info').textContent.trim();
    spotifyAPI.displayPlaylist(playlistName);
  });
});

// Call setupPlaylistItems after the API is initialized
document.addEventListener('DOMContentLoaded', () => {
  const api = new SpotifyAPI();
  api.setupPlaylistItems();
});