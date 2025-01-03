const CLIENT_ID = 'f9947aa68051427282c99c3f165e35f3'; // Replace with your actual Client ID
const CLIENT_SECRET = 'b3ab18efe5444917b39acea2a0f9f722'; // Replace with your actual Client Secret
const REDIRECT_URI = 'http://localhost/music/discover.html';
const SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private', // Add necessary scopes
  'playlist-read-collaborative'
].join(' '); // Include any additional scopes you need

const DEFAULT_ALBUM_ART = 'https://via.placeholder.com/150';

class SpotifyAPI {
  constructor() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    this.tokenExpiry = parseInt(localStorage.getItem('spotify_token_expiry'), 10);
    this.clientId = CLIENT_ID;
    this.clientSecret = CLIENT_SECRET;

    this.init();
  }

  // Initialize the API by handling authentication
  async init() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      await this.getAccessToken(code);
      // Remove the code parameter from the URL for cleanliness
      window.history.replaceState({}, document.title, REDIRECT_URI);
      this.loadDefaultView();
    } else if (this.accessToken && this.refreshToken && this.tokenExpiry) {
      if (new Date().getTime() > this.tokenExpiry) {
        await this.refreshAccessToken();
      }
      this.loadDefaultView();
    } else {
      this.redirectToSpotifyAuth();
    }
  }

  // Redirect user to Spotify authorization flow
  redirectToSpotifyAuth() {
    const url = `https://accounts.spotify.com/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = url;
  }

  // Exchange authorization code for access token
  async getAccessToken(code) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', REDIRECT_URI);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error_description);
      }

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token || this.refreshToken; // Spotify may not always return a new refresh token
      this.tokenExpiry = new Date().getTime() + data.expires_in * 1000;

      // Store tokens in localStorage
      localStorage.setItem('spotify_access_token', this.accessToken);
      if (this.refreshToken) {
        localStorage.setItem('spotify_refresh_token', this.refreshToken);
      }
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry);

      console.log('Access Token acquired:', this.accessToken);
    } catch (error) {
      console.error('Error getting access token:', error);
      // Redirect to auth again if token fetch fails
      setTimeout(() => this.redirectToSpotifyAuth(), 3000);
    }
  }

  // Refresh access token using the refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      console.error("No refresh token available.");
      this.redirectToSpotifyAuth();
      return;
    }

    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", this.refreshToken);

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`),
        },
        body: params.toString(),
      });

      if (!response.ok) {
        console.error("Failed to refresh token:", response);
        this.redirectToSpotifyAuth();
        return;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date().getTime() + data.expires_in * 1000;

      // Update localStorage
      localStorage.setItem('spotify_access_token', this.accessToken);
      localStorage.setItem('spotify_token_expiry', this.tokenExpiry);

      // Spotify may not return a new refresh token
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
        localStorage.setItem('spotify_refresh_token', this.refreshToken);
      }

      console.log('Access Token refreshed:', this.accessToken);
      return this.accessToken;
    } catch (err) {
      console.error("Error refreshing the token:", err);
      this.redirectToSpotifyAuth();
    }
  }

  // Fetch with token refresh
  async fetchWithTokenRefresh(url, options = {}) {
    if (this.tokenExpiry && new Date().getTime() > this.tokenExpiry) {
      await this.refreshAccessToken();
    }

    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${this.accessToken}`;

    const response = await fetch(url, options);

    if (response.status === 401) {
      console.warn("Access token expired or invalid. Refreshing token...");
      await this.refreshAccessToken();
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
      return fetch(url, options);
    }

    return response;
  }

  // Load recommended & popular tracks by user preferences
  async loadDefaultView(seedGenres = 'pop,rock') {
    try {
      // Use the search endpoint with genre filters
      const searchResponse = await this.fetchWithTokenRefresh(
        `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(seedGenres)}&type=track&limit=20`,
        {
          method: "GET",
        }
      );

      if (!searchResponse.ok) {
        console.error("Failed to fetch search:", searchResponse.status, searchResponse.statusText);
        return;
      }

      const searchData = await searchResponse.json();
      console.log('Search Results:', searchData.tracks?.items);
      this.displaySearchResults(searchData.tracks?.items || [], 'recommended-grid');
    } catch (error) {
      console.error("Error loading default view:", error);
    }
  }

  // Display list of tracks
  displaySearchResults(tracks, gridId) {
    const albumGrid = document.getElementById(gridId);
    albumGrid.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      albumGrid.innerHTML = '<div class="loading">No tracks found</div>';
      return;
    }

    tracks.forEach(track => {
      if (!track) return;
      const artUrl = track.album?.images?.[0]?.url || DEFAULT_ALBUM_ART;
      // Build the track card
      const albumCard = document.createElement('div');
      albumCard.className = 'album-card';
      albumCard.innerHTML = `
        <div class="album-art" 
             style="background-image: url('${artUrl}')">
          <div class="album-overlay">
            <button class="heart-button" data-track-id="${track.id}">♥</button>
          </div>
        </div>
        <div class="track-info">
          <div class="track-title">${track.name}</div>
          <div class="track-artist">
            ${track.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
          </div>
        </div>
      `;
      albumGrid.appendChild(albumCard);
    });

    this.setupHeartButtons();
  }

  // Setup "heart" click events
  setupHeartButtons() {
    document.querySelectorAll('.heart-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        const trackId = e.target.dataset.trackId;
        await this.heartTrack(trackId);
      });
    });
  }

  // Send track ID to heart.php
  async heartTrack(trackId) {
    try {
      const response = await fetch('heart.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Track hearted successfully');
      } else {
        console.error('Error hearting track:', data.message);
      }
    } catch (error) {
      console.error('Error hearting track:', error);
    }
  }

  // Search tracks based on user input
  async searchTracks(query) {
    try {
      const searchResponse = await this.fetchWithTokenRefresh(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
        {
          method: "GET",
        }
      );

      if (!searchResponse.ok) {
        console.error("Failed to fetch search:", searchResponse.status, searchResponse.statusText);
        return;
      }

      const searchData = await searchResponse.json();
      console.log('Search Results:', searchData.tracks?.items);
      this.displaySearchResults(searchData.tracks?.items || [], 'recommended-grid');
    } catch (error) {
      console.error("Error searching tracks:", error);
    }
  }
}

// Instantiate the API and set up search
const spotifyAPI = new SpotifyAPI();

// Set up event listeners for search input and button
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.song-search input');
  const searchButton = document.querySelector('.search-button');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      if (e.target.value.length > 2) {
        spotifyAPI.searchTracks(e.target.value);
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value;
      if (query.length > 2) {
        spotifyAPI.searchTracks(query);
      }
    });
  }
});