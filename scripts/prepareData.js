import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPOTIFY_PATH = path.join(__dirname, '../raw-data/spotify_history.csv');
const TRANSACTIONS_PATH = path.join(__dirname, '../raw-data/Daily Household Transactions.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/life-receipts.json');

// Placeholders mapping for anonymized Place notes (PRD Section 7.4)
const PLACE_MAPPING = {
  'Place 0': 'Apex Coffee Roasters',
  'Place 1': 'Metro Transit Station',
  'Place 2': 'Central Park Plaza',
  'Place 3': 'Summit Fitness Club',
  'Place 4': 'Riverside Library',
  'Place 5': 'Downtown Food Hall',
  'Place 6': 'Grand Avenue Market'
};

// Categories to drop from Household Transactions (PRD Section 7.3 & 7.4)
const EXCLUDED_CATEGORIES = [
  'investment', 'investments', 'savings', 'salary', 
  'recurring deposit', 'ppf', 'mutual fund', 'dividends', 'transfer'
];

// Helper: Check if date falls within 2017 (PRD Section 7.4)
function is2017(dateString) {
  const d = new Date(dateString);
  return d.getFullYear() === 2017;
}

// -------------------------------------------------------------
// 1. Process Household Transactions -> Purchases & Places
// -------------------------------------------------------------
function processTransactions() {
  return new Promise((resolve, reject) => {
    const receipts = [];
    fs.createReadStream(TRANSACTIONS_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const dateStr = row.Date || row.Timestamp || row.date;
        if (!dateStr || !is2017(dateStr)) return;

        const category = (row.Category || '').toLowerCase();
        const subcategory = (row.Subcategory || row.SubCategory || '').toLowerCase();

        // Filter out investment/savings/salary rows (PRD Section 7.3)
        if (EXCLUDED_CATEGORIES.some(ex => category.includes(ex) || subcategory.includes(ex))) {
          return;
        }

        const note = row.Note || row.Description || '';
        const timestamp = new Date(dateStr).toISOString();
        const amount = parseFloat(row.Amount || row.Cost || '0');

        // Check if row belongs to Places (Transportation / Tourism) (PRD Section 7.4)
        if (category.includes('transportation') || category.includes('tourism') || category.includes('travel')) {
          let locationName = 'City Center';
          for (const [key, val] of Object.entries(PLACE_MAPPING)) {
            if (note.includes(key)) locationName = val;
          }

          receipts.push({
            id: `place-${receipts.length + 1}`,
            type: 'place',
            title: locationName,
            timestamp: timestamp,
            description: note ? `Visited ${locationName} (${note}).` : `Visited ${locationName}.`,
            location: locationName,
            metadata: { category: row.Category, subcategory: row.Subcategory }
          });
        } else {
          // Regular Purchase receipt (PRD Section 7.4)
          const title = row.Subcategory || row.Category || 'Purchase';
          const description = note 
            ? `${row.Category} expense: ${note}` 
            : `Spent funds on ${row.Subcategory || row.Category || 'general items'}.`;

          receipts.push({
            id: `purchase-${receipts.length + 1}`,
            type: 'purchase',
            title: title,
            timestamp: timestamp,
            description: description,
            metadata: { amount: amount, category: row.Category }
          });
        }
      })
      .on('end', () => resolve(receipts))
      .on('error', (err) => reject(err));
  });
}

// -------------------------------------------------------------
// 2. Process Spotify History -> Aggregated Music Sessions
// -------------------------------------------------------------
function processSpotify() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(SPOTIFY_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const timestamp = row.ts || row.timestamp || row.endTime;
        if (timestamp && is2017(timestamp)) {
          rows.push({
            timestamp: new Date(timestamp),
            artist: row.master_metadata_album_artist_name || row.artistName || 'Unknown Artist',
            track: row.master_metadata_track_name || row.trackName || 'Unknown Track',
            msPlayed: parseInt(row.ms_played || row.msPlayed || '0', 10),
            skipped: row.skipped === 'true' || row.skipped === true
          });
        }
      })
      .on('end', () => {
        // Sort chronologically
        rows.sort((a, b) => a.timestamp - b.timestamp);

        const sessions = [];
        let currentSession = [];

        // Cluster tracks with < 30 min gap (PRD Section 7.4)
        for (const track of rows) {
          if (currentSession.length === 0) {
            currentSession.push(track);
          } else {
            const lastTrack = currentSession[currentSession.length - 1];
            const diffMinutes = (track.timestamp - lastTrack.timestamp) / (1000 * 60);

            if (diffMinutes <= 30) {
              currentSession.push(track);
            } else {
              sessions.push(currentSession);
              currentSession = [track];
            }
          }
        }
        if (currentSession.length > 0) sessions.push(currentSession);

        // Convert listening sessions into single Music receipts (PRD Section 7.4)
        const musicReceipts = sessions.map((session, idx) => {
          const artistCounts = {};
          let totalMs = 0;
          let skipCount = 0;

          session.forEach(t => {
            artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
            totalMs += t.msPlayed;
            if (t.skipped) skipCount++;
          });

          // Identify dominant artist
          const dominantArtist = Object.keys(artistCounts).reduce((a, b) => 
            artistCounts[a] > artistCounts[b] ? a : b
          );

          const durationMin = Math.max(1, Math.round(totalMs / (1000 * 60)));
          const firstTrack = session[0];

          return {
            id: `music-${idx + 1}`,
            type: 'music',
            title: `${dominantArtist} Session`,
            timestamp: firstTrack.timestamp.toISOString(),
            description: `Listened to ${session.length} tracks featuring ${dominantArtist} over ${durationMin} mins.`,
            metadata: {
              trackCount: session.length,
              durationMinutes: durationMin,
              dominantArtist: dominantArtist,
              skips: skipCount
            }
          };
        });

        resolve(musicReceipts);
      })
      .on('error', (err) => reject(err));
  });
}

// -------------------------------------------------------------
// 3. Hand-authored Entries (PRD Section 7.4 & 8.1)
// -------------------------------------------------------------
const HAND_AUTHORED_RECEIPTS = [
  // Movies
  { id: 'movie-1', type: 'movie', title: 'Blade Runner 2049', timestamp: '2017-10-07T20:15:00Z', description: 'Watched late night screening in IMAX.', location: 'Downtown Cinema', metadata: { rating: '5/5' } },
  { id: 'movie-2', type: 'movie', title: 'Get Out', timestamp: '2017-02-25T18:30:00Z', description: 'Weekend movie night with friends.', location: 'Starlight Theater', metadata: { rating: '4.5/5' } },
  { id: 'movie-3', type: 'movie', title: 'Dunkirk', timestamp: '2017-07-21T19:00:00Z', description: 'Evening show on opening weekend.', location: 'Downtown Cinema', metadata: { rating: '4/5' } },

  // Photos
  { id: 'photo-1', type: 'photo', title: 'Sunset at Riverside', timestamp: '2017-04-12T18:45:00Z', description: 'Captured vibrant golden hour reflection over the water.', location: 'Riverside Park', metadata: { device: 'Mobile' } },
  { id: 'photo-2', type: 'photo', title: 'Coffee Latte Art', timestamp: '2017-06-18T09:15:00Z', description: 'Quick snapshot of morning espresso setup.', location: 'Apex Coffee Roasters', metadata: { device: 'Mobile' } },
  { id: 'photo-3', type: 'photo', title: 'Workspace Setup', timestamp: '2017-09-02T11:00:00Z', description: 'Clean desk state before starting a new side project.', location: 'Home Office', metadata: { device: 'Mobile' } },

  // Messages
  { id: 'message-1', type: 'message', title: 'Chat with Alex', timestamp: '2017-03-14T14:22:00Z', description: 'Discussed plans for upcoming long weekend trip.', metadata: { platform: 'Signal' } },
  { id: 'message-2', type: 'message', title: 'Group Sync: Dinner', timestamp: '2017-08-05T17:10:00Z', description: 'Coordinated reservation time and table preferences.', metadata: { platform: 'WhatsApp' } },

  // Searches
  { id: 'search-1', type: 'search', title: 'best mechanical keyboard switches 2017', timestamp: '2017-01-15T22:05:00Z', description: 'Late night search comparing linear vs tactile switches.', metadata: { engine: 'DuckDuckGo' } },
  { id: 'search-2', type: 'search', title: 'react context api vs redux', timestamp: '2017-05-19T10:40:00Z', description: 'Researched state management patterns for frontend builds.', metadata: { engine: 'Google' } },

  // Events
  { id: 'event-1', type: 'event', title: 'Indie Music Fest 2017', timestamp: '2017-05-27T16:00:00Z', description: 'Attended outdoor live performance event.', location: 'Central Park Plaza', metadata: { ticketType: 'General Admission' } },
  { id: 'event-2', type: 'event', title: 'Local Tech Meetup', timestamp: '2017-11-09T18:30:00Z', description: 'Participated in evening developer lightning talks.', location: 'Metro Transit Station', metadata: { category: 'Networking' } },

  // Personal Notes
  { id: 'note-1', type: 'note', title: 'Q2 Reflection & Goals', timestamp: '2017-04-01T08:00:00Z', description: 'Jotted quick thoughts on habit tracking and focus hours.', metadata: { app: 'Notes' } },
  { id: 'note-2', type: 'note', title: 'Project Idea: Memory Receipts', timestamp: '2017-10-18T21:30:00Z', description: 'Drafted concept for turning personal telemetry into a visual story.', metadata: { app: 'Notes' } }
];

// -------------------------------------------------------------
// 4. Execution Pipeline
// -------------------------------------------------------------
async function runPipeline() {
  try {
    console.log('🔄 Processing Household Transactions...');
    const txReceipts = await processTransactions();

    console.log('🔄 Processing Spotify History...');
    const musicReceipts = await processSpotify();

    console.log('🔄 Combining all categories...');
    const allReceipts = [...txReceipts, ...musicReceipts, ...HAND_AUTHORED_RECEIPTS];

    // Sort chronologically (PRD Section 8.1)
    allReceipts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Ensure output folder exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allReceipts, null, 2));
    console.log(`✅ Pipeline finished! Output written to ${OUTPUT_PATH} (${allReceipts.length} total moments).`);
  } catch (err) {
    console.error('❌ Pipeline failed:', err);
  }
}

runPipeline();