/**
 * TimeTransfer, the converter contains three part:
 * 1. prefix, can be s(timestamp in second), m(timestamp in millisecond) u(in utc time zone)
 * 2.1 time offset, something like 1Y2M1w3D8h3m2s100S; if no adverbial is set, then the time offset will change to be 2.2
 * 2.2 time string, will use Date constructor to get timestamp
 * 3. adverbial, include: ago/before, later/after, from now
 * 
 * "a few moments later" also works :>_<:
 */
import Parser from './parser';
import dayjs = require('dayjs');

export default class TimeTransfer {
  private parser = new Parser();

  public transfer (time: string, base: number) {
    const segments = this.parser.parse(time);
    // console.log('segments: ', segments);
    // whether or not count from now
    const isFromNow = segments.adverbial.fromNow;
    let stime: number|string|undefined = segments.time?.trim();
    let { isSecond, isMilliSecond, isUTC } = segments.prefix;
    
    if (stime) {
      // some "keywords"
      if (stime === 'now') {
        // "dayjs(undefined)" is now
        stime = undefined;
      } else if (stime === 'a few moments later') {
        stime = Date.now() + (5 * 60 * 1000) + (100 * 365 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000) * Math.random();
      }
      const result = isUTC ? dayjs(stime).utc(true) : dayjs(stime);
      
      return isSecond ? result.unix() : result.valueOf();
    }
    
    // auto detect timestamp unit, manually setting ($ for second, @ for millisecond) will not be replaced
    !isFromNow && base < 1e11 && !isMilliSecond && (isSecond = true);

    const timestampBase = isFromNow ? Date.now() : (isSecond ? base * 1000 : base);
    const timeoffset = segments.timeoffset || {};
    const timeoffsetKeys = Object.keys(timeoffset!) as Array<dayjs.UnitTypeShort>;

    let result = dayjs(0);
    if (['ago', 'before'].includes(segments.adverbial.type)) {
      result = timeoffsetKeys.reduce((acc, key) => {
        return acc.subtract(timeoffset[key]!, key);
      }, dayjs(timestampBase));
    } else if (['later', 'after'].includes(segments.adverbial.type)) {
      result = timeoffsetKeys.reduce((acc, key) => {
        return acc.add(timeoffset[key]!, key);
      }, dayjs(timestampBase));
    }

    return isSecond ? result.unix() : result.valueOf();
  }
}
