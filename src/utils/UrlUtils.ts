import { isArray, pairs, compact, uniq, rest } from 'underscore';
import { Utils } from './Utils';
import { IEndpointCallParameters } from '../rest/EndpointCaller';

export interface IUrlNormalize {
  paths: string[] | string;
  queryAsString?: string[] | string;
  query?: Record<string, any>;
}

export interface IUrlNormalizedParts {
  pathsNormalized: string[];
  queryNormalized: string[];
  path: string;
}

export class UrlUtils {
  public static getUrlParameter(name: string): string {
    return (
      decodeURIComponent(
        (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ''])[1].replace(/\+/g, '%20')
      ) || null
    );
  }

  public static merge(endpointParameters: IEndpointCallParameters, ...parts: IUrlNormalize[]) {
    parts.forEach(part => {
      const { path, queryNormalized } = UrlUtils.normalizeAsParts(part);

      if (Utils.isNonEmptyString(path)) {
        endpointParameters = { ...endpointParameters, url: path };
      }

      if (Utils.isNonEmptyArray(queryNormalized)) {
        if (Utils.isNonEmptyArray(endpointParameters.queryString)) {
          endpointParameters = {
            ...endpointParameters,
            queryString: Utils.concatWithoutDuplicate(endpointParameters.queryString, queryNormalized)
          };
        } else {
          endpointParameters = { ...endpointParameters, queryString: queryNormalized };
        }
      }
    });
    return endpointParameters;
  }

  public static normalizeAsString(toNormalize: IUrlNormalize): string {
    const { queryNormalized, path } = this.normalizeAsParts(toNormalize);

    return `${path}${this.addToUrlIfNotEmpty(queryNormalized, '&', '?')}`;
  }

  public static normalizeAsParts(toNormalize: IUrlNormalize): IUrlNormalizedParts {
    const pathsNormalized = this.normalizePaths(toNormalize);
    const queryNormalized = this.normalizeQueryString(toNormalize);

    return {
      pathsNormalized,
      queryNormalized,
      path: this.addToUrlIfNotEmpty(pathsNormalized, '/', '')
    };
  }

  private static normalizePaths(toNormalize: IUrlNormalize) {
    return this.toArray(toNormalize.paths).map(path => {
      if (Utils.isNonEmptyString(path)) {
        return this.removeProblematicChars(path);
      }
      return '';
    });
  }

  private static normalizeQueryString(toNormalize: IUrlNormalize) {
    let queryNormalized: string[] = [];

    if (toNormalize.queryAsString) {
      const cleanedUp = this.toArray(toNormalize.queryAsString).map(query => {
        query = this.removeProblematicChars(query);
        query = this.encodeKeyValuePair(query);
        return query;
      });
      queryNormalized = queryNormalized.concat(cleanedUp);
    }

    if (toNormalize.query) {
      const paired: string[][] = pairs(toNormalize.query);
      const mapped = paired.map(pair => {
        const [key, value] = pair;

        if (Utils.isNullOrUndefined(value) || Utils.isNullOrUndefined(key)) {
          return '';
        }

        if (!this.isEncoded(value)) {
          return [this.removeProblematicChars(key), Utils.safeEncodeURIComponent(value)].join('=');
        } else {
          return [this.removeProblematicChars(key), value].join('=');
        }
      });
      queryNormalized = queryNormalized.concat(mapped);
    }

    return uniq(queryNormalized);
  }

  private static addToUrlIfNotEmpty(toAdd: string[], joinWith: string, leadWith: string) {
    if (Utils.isNonEmptyArray(toAdd)) {
      return `${leadWith}${compact(toAdd).join(joinWith)}`;
    }
    return '';
  }

  private static startsWith(searchString: string, targetString: string) {
    return targetString.charAt(0) == searchString;
  }

  private static endsWith(searchString: string, targetString: string) {
    return targetString.charAt(targetString.length - 1) == searchString;
  }

  private static removeAtEnd(searchString: string, targetString: string) {
    while (this.endsWith(searchString, targetString)) {
      targetString = targetString.slice(0, targetString.length - searchString.length);
    }

    return targetString;
  }

  private static removeAtStart(searchString: string, targetString: string) {
    while (this.startsWith(searchString, targetString)) {
      targetString = targetString.slice(searchString.length);
    }
    return targetString;
  }

  private static toArray(parameter: string | string[]): string[] {
    let ret: string[];
    if (!isArray(parameter)) {
      ret = [parameter];
    } else {
      ret = parameter;
    }
    return ret;
  }

  private static encodeKeyValuePair(pair: string) {
    const split = pair.split('=');
    if (split.length == 0) {
      return pair;
    }

    let key = split[0];
    let value = rest(split, 1).join('');

    if (!key) {
      return pair;
    }
    if (!value) {
      return pair;
    }

    key = this.removeProblematicChars(key);
    if (!this.isEncoded(value)) {
      value = Utils.safeEncodeURIComponent(value);
    }

    return `${key}=${value}`;
  }

  private static removeProblematicChars(value: string) {
    ['?', '/', '#', '='].forEach(problematicChar => {
      value = this.removeAtStart(problematicChar, value);
      value = this.removeAtEnd(problematicChar, value);
    });
    return value;
  }

  private static isEncoded(value: string) {
    return value != decodeURIComponent(value);
  }
}
