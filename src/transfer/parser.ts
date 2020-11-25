
import dayjs = require('dayjs');

interface MParser {
  parse(timeString: string): TransferSegments;
}

export type Prefix = '$' | '@' | '%'; // $ for second, @ for millisecond, % for utc

export type TimeAdverbial = 'ago' | 'before' | 'after' | 'later' | 'unknown';

export type TransferSegments = {
  prefix: {
    isSecond: boolean,
    isMilliSecond: boolean,
    isUTC: boolean
  },
  timeoffset?: Partial<Record<dayjs.OpUnitType, number>>,
  time?: string,
  adverbial: {
    type: TimeAdverbial,
    fromNow: boolean
  }
};

const dateMarkShort2FullMap = {
  'd': 'day',
  'D': 'day',
  'y': 'year',
  'Y': 'year',
  'M': 'month',
  'h': 'hour',
  'm': 'minute',
  's': 'second',
  'w': 'week',
  'S': 'millisecond'
} as const;

export default class Parser implements MParser {
  public parse(timeString: string): TransferSegments {
    const segments = timeString.split(/\s+/);
    let [firstPart = '', ...adverbial] = segments;
    const prefixMatch = firstPart.match(/^([%\$@]+)/);

    let prefix = '', time = '';
    if (!prefixMatch) {
      // no prefix specified
      time = firstPart;
    } else {
      prefix = prefixMatch[1];
      time = firstPart.slice(prefix.length);
    }

    const result = {
      prefix: this.parsePrefix(prefix),
      timeoffset: this.parseTime(time),
      adverbial: this.parseAdverbial(adverbial),
    };

    // if no adverbial is found, then should be parsed as full Date description
    if (result.adverbial.type === 'unknown') {
      return {
        prefix: result.prefix,
        time: `${time} ${adverbial.join(' ')}`,
        adverbial: result.adverbial,
      };
    }

    return result;
  }

  private parsePrefix(prefix: string) {
    return {
      isSecond: /\$/.test(prefix),
      isMilliSecond: /@/.test(prefix),
      isUTC: /%/.test(prefix)
    };
  }

  private parseTime(time: string) {
    const parseTimeReg = /(\d+)([a-zA-Z])/g;
    let k = null;
    const timepick: TransferSegments['timeoffset'] = {};
    while (k = parseTimeReg.exec(time)) {
      const [_, num, unit] = k;
      if (unit) {
        const key = dateMarkShort2FullMap[unit as (keyof typeof dateMarkShort2FullMap)];
        timepick[key] = Number(num) || 0;
      }
    }
    return timepick;
  }

  private parseAdverbial(adverbial: Array<string>) {
    const str = adverbial.join(' ');
    const m = str.match(/^(ago|later|before|after)( from now)?/);
    return {
      type: m ? m[1] as TimeAdverbial : 'unknown',
      fromNow: !!(m && m[2])
    };
  }
}
