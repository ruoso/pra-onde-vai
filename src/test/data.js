// The generated tune file and statistics, for tests (npm run data writes them).
import tuneFile from '../data/generated/tunes.json';
import statsFile from '../data/generated/stats.json';

export const realTunes = () => tuneFile.tunes;
export const realStats = () => statsFile;
export const tuneById = (id) => realTunes().find((t) => t.id === id);
