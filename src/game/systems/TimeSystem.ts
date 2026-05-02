export const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
] as const;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_NAMES: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季'
};

export const SEASON_COLORS: Record<Season, number> = {
  spring: 0x90EE90,
  summer: 0xFFE4B5,
  autumn: 0xDEB887,
  winter: 0xE0FFFF
};

export interface TimeState {
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
  solarTermIndex: number;
  solarTermName: string;
  season: Season;
  isLanternFestival: boolean;
}

export class TimeSystem {
  private totalMinutes: number = 0;
  
  private static readonly MINUTES_PER_SOLAR_TERM = 24;
  private static readonly MINUTES_PER_DAY = 24;
  private static readonly TIME_SCALE = 10;

  constructor(startMinutes: number = 0) {
    this.totalMinutes = startMinutes;
  }

  update(delta: number): void {
    const minutesToAdd = delta * 0.001 * TimeSystem.TIME_SCALE;
    this.totalMinutes += minutesToAdd;
  }

  getTotalMinutes(): number {
    return this.totalMinutes;
  }

  setTotalMinutes(minutes: number): void {
    this.totalMinutes = minutes;
  }

  getState(): TimeState {
    const minutesInDay = TimeSystem.MINUTES_PER_DAY;
    const day = Math.floor(this.totalMinutes / minutesInDay);
    const dayMinutes = this.totalMinutes % minutesInDay;
    const hour = Math.floor(dayMinutes);
    const minute = Math.floor((dayMinutes - hour) * 60);

    const solarTermIndex = Math.floor(this.totalMinutes / TimeSystem.MINUTES_PER_SOLAR_TERM) % 24;
    const solarTermName = SOLAR_TERMS[solarTermIndex];
    
    const season = this.getSeasonFromSolarTerm(solarTermIndex);
    const isLanternFestival = solarTermIndex >= 10 && solarTermIndex <= 12;

    return {
      totalMinutes: this.totalMinutes,
      day,
      hour,
      minute,
      solarTermIndex,
      solarTermName,
      season,
      isLanternFestival
    };
  }

  private getSeasonFromSolarTerm(index: number): Season {
    if (index >= 0 && index < 6) return 'spring';
    if (index >= 6 && index < 12) return 'summer';
    if (index >= 12 && index < 18) return 'autumn';
    return 'winter';
  }

  isSolarTermInSeasons(solarTermIndex: number, seasons: Season[]): boolean {
    const termSeason = this.getSeasonFromSolarTerm(solarTermIndex);
    return seasons.includes(termSeason);
  }
}
