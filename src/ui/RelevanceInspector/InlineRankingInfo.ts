import { IQueryResult } from '../../rest/QueryResult';
import { parseRankingInfo, IRankingInfo, buildListOfTermsElement } from './RankingInfoParser';
import { $$ } from '../../UtilsModules';
import { each } from 'underscore';

export class InlineRankingInfo {
  private rankingInfo: IRankingInfo;
  constructor(public result: IQueryResult) {
    this.rankingInfo = parseRankingInfo(result.rankingInfo);
  }

  public build() {
    const container = $$('div', {
      className: 'coveo-relevance-inspector-inline-ranking'
    });

    each(this.rankingInfo.documentWeights, (value: any, key: string) => {
      const section = $$('div', { className: 'coveo-relevance-inspector-inline-ranking-section' }, `${key}: ${value}`);
      container.append(section.el);
    });

    const total = $$(
      'div',
      { className: 'coveo-relevance-inspector-highlight coveo-relevance-inspector-inline-ranking-section' },
      `Total: ${this.rankingInfo.totalWeight}`
    );
    container.append(total.el);

    if (this.rankingInfo.termsWeight) {
      const termsButton = $$(
        'button',
        { className: 'coveo-button coveo-relevance-inspector-inline-ranking-button' },
        'Toggle Terms Relevancy Breakdown'
      );
      container.append(termsButton.el);

      const termsSection = $$('div', { className: 'coveo-relevance-inspector-inline-ranking-terms' });

      container.append(termsSection.el);
      each(this.rankingInfo.termsWeight || {}, (value, key) => {
        const builtKey = `Keyword: ${key}`;
        termsSection.append($$('h2', undefined, builtKey).el);
        termsSection.append(buildListOfTermsElement(value.Weights).el);
      });

      termsButton.on('click', () => termsSection.toggleClass('coveo-active'));
    }

    return container;
  }
}
