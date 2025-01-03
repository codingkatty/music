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
const DISCOVER_GENRES = ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical', 'r-n-b', 'indie'];

class SpotifyAPI {
  constructor() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    this.tokenExpiry = parseInt(localStorage.getItem('spotify_token_expiry'), 10);
    this.clientId = CLIENT_ID;
    this.clientSecret = CLIENT_SECRET;
    this.createModal();
    this.init();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'spotify-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Connect to Spotify</h2>
        <p>Please connect your Spotify account to continue</p>
        <button id="connectSpotify" class="connect-button">Connect with Spotify</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('connectSpotify').addEventListener('click', () => {
      this.redirectToSpotifyAuth();
    });
  }

  showModal() {
    document.querySelector('.spotify-modal').classList.add('show');
  }

  hideModal() {
    document.querySelector('.spotify-modal').classList.remove('show');
  }

  async checkUserSession() {
    try {
      const response = await fetch('get_prefrences.php', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      return data.preferences !== undefined;
    } catch (error) {
      console.error('Error checking user session:', error);
      return false;
    }
  }

  // Initialize the API by handling authentication
  async init() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      // Check if we have valid tokens
      const hasValidTokens = this.accessToken &&
        this.refreshToken &&
        this.tokenExpiry &&
        new Date().getTime() < this.tokenExpiry;

      if (code) {
        await this.getAccessToken(code);
        window.history.replaceState({}, document.title, REDIRECT_URI);
        this.hideModal();
        this.loadDefaultView();
      } else if (hasValidTokens) {
        console.log('Using existing tokens');
        this.hideModal();
        this.loadDefaultView();
      } else {
        console.log('No valid tokens found - showing connect modal');
        localStorage.clear(); // Clear any stale tokens
        this.showModal();
      }

      const isSignedIn = await this.checkUserSession();
      this.updateProfileIcon(isSignedIn);
    } catch (error) {
      console.error('Init error:', error);
      this.showModal();
    }
  }

  updateProfileIcon(isSignedIn) {
    const profileIcon = document.querySelector('.profile-icon');
    if (isSignedIn) {
      profileIcon.style.backgroundImage = 'url("https://via.placeholder.com/150")';
    } else {
      profileIcon.innerHTML = '<a href="login.html">Sign In</a>';
    }
  }

  // Redirect user to Spotify authorization flow
  redirectToSpotifyAuth() {
    try {
      // Clear any existing tokens
      localStorage.clear();

      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('spotify_auth_state', state);

      const url = new URL('https://accounts.spotify.com/authorize');
      url.searchParams.append('client_id', this.clientId);
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('redirect_uri', REDIRECT_URI);
      url.searchParams.append('state', state);
      url.searchParams.append('scope', SCOPES);

      console.log('Redirecting to Spotify auth...');
      window.location.href = url.toString();
    } catch (error) {
      console.error('Auth redirect error:', error);
    }
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
    try {
      if (!this.accessToken) {
        throw new Error('No access token available');
      }

      if (this.tokenExpiry && new Date().getTime() > this.tokenExpiry) {
        console.log('Token expired, refreshing...');
        await this.refreshAccessToken();
      }

      options.headers = options.headers || {};
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;

      const response = await fetch(url, options);

      if (response.status === 401 || response.status === 403) {
        console.log('Token invalid, refreshing...');
        await this.refreshAccessToken();
        options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        return fetch(url, options);
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      this.showModal();
      throw error;
    }
  }

  async getUserPreferences() {
    try {
      const response = await fetch('get_prefrences.php', {
        credentials: 'include'
      });
      const data = await response.json();
      return data.preferences || [];
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return [];
    }
  }

  // Load recommended & popular tracks by user preferences
  async loadDefaultView() {
    try {
      const userPreferences = await this.getUserPreferences();
      let seedGenres = userPreferences.length > 0 ?
        userPreferences.join(',') :
        'pop,rock';

      this.toggleSectionVisibility(false);

      // First load recommended tracks
      const recommendedResponse = await this.fetchWithTokenRefresh(
        `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(seedGenres)}&type=track&limit=15`,
        { method: "GET" }
      );

      if (!recommendedResponse.ok) {
        throw new Error(`Recommended search failed: ${recommendedResponse.status}`);
      }

      const recommendedData = await recommendedResponse.json();
      console.log('Recommended tracks:', recommendedData.tracks?.items?.length);

      // If no recommended tracks, search by genres
      if (!recommendedData.tracks?.items?.length) {
        const allTracks = [];
        const searchGenres = seedGenres.split(',');
        const query = 'top';

        const tracksPerGenre = Math.min(
          Math.max(2, Math.floor(20 / searchGenres.length)),
          4
        );

        for (const genre of searchGenres) {
          const genreResponse = await this.fetchWithTokenRefresh(
            `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(genre)} ${encodeURIComponent(query)}&type=track&limit=${tracksPerGenre}`,
            { method: "GET" }
          );

          if (genreResponse.ok) {
            const genreData = await genreResponse.json();
            if (genreData.tracks?.items) {
              allTracks.push(...genreData.tracks.items);
            }
          }
        }

        const shuffledTracks = allTracks.sort(() => Math.random() - 0.5);
        console.log('Displaying merged tracks:', shuffledTracks.length);
        await this.displaySearchResults(shuffledTracks, 'recommended-grid');
      } else {
        await this.displaySearchResults(recommendedData.tracks?.items || [], 'recommended-grid');
      }

      // Then load discover tracks
      const randomGenre = DISCOVER_GENRES[Math.floor(Math.random() * DISCOVER_GENRES.length)];
      console.log('Selected random genre:', randomGenre);
      
      const discoverResponse = await this.fetchWithTokenRefresh(
        `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(randomGenre)}&type=track&limit=15`,
        { method: "GET" }
      );

      if (!discoverResponse.ok) {
        throw new Error(`Discover search failed: ${discoverResponse.status}`);
      }

      const discoverData = await discoverResponse.json();
      console.log('Discover tracks:', discoverData.tracks?.items?.length);
      
      const discoverGrid = document.getElementById('discover-new-grid');
      if (!discoverGrid) {
        console.error('Discover grid element not found');
        return;
      }
      
      discoverGrid.style.display = 'grid';
      await this.displaySearchResults(discoverData.tracks?.items || [], 'discover-new-grid');
      
    } catch (error) {
      console.error("Error loading default view:", error);
    }
  }

  // Display list of tracks
  async displaySearchResults(tracks, gridId) {
    const albumGrid = document.getElementById(gridId);
    albumGrid.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      albumGrid.innerHTML = '<div class="loading">No tracks found</div>';
      return;
    }

    for (const track of tracks) {
      if (!track) continue;
      const artUrl = track.album?.images?.[0]?.url || DEFAULT_ALBUM_ART;

      // Fetch artist information to get genre
      const artistId = track.artists[0]?.id;
      let genre = 'unknown';
      if (artistId) {
        try {
          const artistResponse = await this.fetchWithTokenRefresh(
            `https://api.spotify.com/v1/artists/${artistId}`,
            { method: "GET" }
          );
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            genre = artistData.genres[0] || 'unknown';
          }
        } catch (error) {
          console.error(`Error fetching artist data for ID ${artistId}:`, error);
        }
      }

      // Build the track card
      const albumCard = document.createElement('div');
      albumCard.className = 'album-card';
      albumCard.innerHTML = `
        <div class="album-art" 
             style="background-image: url('${artUrl}')">
          <div class="album-overlay">
            <button class="heart-button" data-genre="${genre}">♥</button>
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
    }

    // After all tracks are rendered, set up heart button event listeners
    this.setupHeartButtons();
  }

  setupHeartButtons() {
    const heartButtons = document.querySelectorAll('.heart-button');
    console.log('Setting up heart buttons:', heartButtons.length); // Debug log

    heartButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const genre = e.target.dataset.genre;
        console.log('Heart button clicked:', genre); // Debug log
        await this.heartTrack(genre);
      });
    });
  }

  // Send genre to heart.php
  async heartTrack(genre) {
    try {
      const response = await fetch('heart.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Genre preference updated successfully');
      } else {
        console.error('Error updating genre preference:', data.message);
      }
    } catch (error) {
      console.error('Error updating genre preference:', error);
    }
  }

  // Search tracks based on user input
  async searchTracks(query) {
    try {
      this.toggleSectionVisibility(true);
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

  // Toggle section visibility based on search state
  toggleSectionVisibility(isSearching) {
    const recommendedTitle = document.querySelector('h2:first-of-type');
    const discoverTitle = document.querySelector('h2:last-of-type');
    const discoverGrid = document.getElementById('discover-new-grid');

    if (isSearching) {
      recommendedTitle.textContent = 'Search Results';
      discoverTitle.style.display = 'none';
      discoverGrid.style.display = 'none';
    } else {
      recommendedTitle.textContent = 'Recommended for You';
      discoverTitle.style.display = 'block';
      discoverGrid.style.display = 'grid';
    }
  }
}

// Instantiate the API and set up search
const spotifyAPI = new SpotifyAPI();

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.song-search input');
  const searchButton = document.querySelector('.search-button');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      if (e.target.value.length > 2) {
        spotifyAPI.searchTracks(e.target.value);
      }
      if (e.target.value.length === 0) {
        spotifyAPI.loadDefaultView();
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