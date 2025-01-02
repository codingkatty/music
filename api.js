const CLIENT_ID = 'f9947aa68051427282c99c3f165e35f3'; // Get this from Spotify Developer Dashboard
const CLIENT_SECRET = 'b3ab18efe5444917b39acea2a0f9f722'; // Get this from Spotify Developer Dashboard
const REDIRECT_URI = 'http://127.0.0.1:5500/discover.html';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-library-modify'
].join(' ');

const DEFAULT_ALBUM_ART = 'https://via.placeholder.com/150'; // Placeholder image

// Initialize Spotify API
class SpotifyAPI {
  constructor() {
    this.accessToken = null;
    this.player = null;
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

  async searchTracks(query) {
    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const data = await response.json();
      console.log('Search Results:', data.tracks.items); // Log search results
      this.displaySearchResults(data.tracks.items, 'recommended-grid');
    } catch (error) {
      console.error('Error searching tracks:', error);
    }
  }

  async loadDefaultView() {
    const recommendedGrid = document.getElementById('recommended-grid');
    const discoverNewGrid = document.getElementById('discover-new-grid');
    recommendedGrid.innerHTML = '<div class="loading">Loading...</div>';
    discoverNewGrid.innerHTML = '<div class="loading">Loading...</div>';

    try {
      // Fetch user preferences from the database
      const preferencesResponse = await fetch('get_preferences.php');
      if (!preferencesResponse.ok) throw new Error('PHP backend not available');
      const preferencesData = await preferencesResponse.json();
      const seedGenres = preferencesData.preferences.join(',');

      // Fetch recommendations based on user preferences
      const recommendationsResponse = await fetch(`https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const recommendationsData = await recommendationsResponse.json();
      this.displaySearchResults(recommendationsData.tracks, 'recommended-grid');

      // Fetch popular songs
      const popularResponse = await fetch(`https://api.spotify.com/v1/browse/featured-playlists`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const popularData = await popularResponse.json();
      if (popularData.playlists && popularData.playlists.items.length > 0) {
        const featuredPlaylist = popularData.playlists.items[0];
        const tracksResponse = await fetch(featuredPlaylist.tracks.href, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
        const tracksData = await tracksResponse.json();
        this.displaySearchResults(tracksData.items.map(item => item.track), 'discover-new-grid');
      }
    } catch (error) {
      console.error('Error loading default view:', error);
      this.loadPlaceholderData();
    }
  }

  async loadPlaceholderData() {
    const recommendedGrid = document.getElementById('recommended-grid');
    const discoverNewGrid = document.getElementById('discover-new-grid');
    recommendedGrid.innerHTML = '';
    discoverNewGrid.innerHTML = '';

    // Use hardcoded preferences and fetch tracks from Spotify API
    const seedGenres = 'pop,rock';

    try {
      // Fetch recommendations based on hardcoded preferences
      const recommendationsResponse = await fetch(`https://api.spotify.com/v1/recommendations?seed_genres=${seedGenres}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const recommendationsData = await recommendationsResponse.json();
      this.displaySearchResults(recommendationsData.tracks, 'recommended-grid');

      // Fetch popular songs
      const popularResponse = await fetch(`https://api.spotify.com/v1/browse/featured-playlists`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      const popularData = await popularResponse.json();
      if (popularData.playlists && popularData.playlists.items.length > 0) {
        const featuredPlaylist = popularData.playlists.items[0];
        const tracksResponse = await fetch(featuredPlaylist.tracks.href, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
        const tracksData = await tracksResponse.json();
        this.displaySearchResults(tracksData.items.map(item => item.track), 'discover-new-grid');
      }
    } catch (error) {
      console.error('Error loading placeholder data:', error);
    }
  }

  displaySearchResults(tracks, gridId) {
    const albumGrid = document.getElementById(gridId);
    albumGrid.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      albumGrid.innerHTML = '<div class="loading">No tracks found</div>';
      return;
    }

    tracks.forEach(track => {
      if (!track) return; // Skip if track is undefined

      const albumCard = document.createElement('div');
      albumCard.className = 'album-card';
      albumCard.innerHTML = `
        <div class="album-art draggable" 
             draggable="true" 
             data-track-id="${track.id}"
             style="background-image: url('${track.album?.images[0]?.url || DEFAULT_ALBUM_ART}')">
          <div class="album-overlay">
            <button class="heart-button" data-track-id="${track.id}">♥</button>
          </div>
        </div>
        <div class="track-info">
          <div class="track-title">${track.name}</div>
          <div class="track-artist">${track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}</div>
        </div>
      `;
      albumGrid.appendChild(albumCard);
    });

    this.setupHeartButtons();
  }

  setupHeartButtons() {
    document.querySelectorAll('.heart-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        const trackId = e.target.dataset.trackId;
        await this.heartTrack(trackId);
      });
    });
  }

  async heartTrack(trackId) {
    try {
      const response = await fetch('heart.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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