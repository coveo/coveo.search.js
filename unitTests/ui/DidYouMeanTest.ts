import * as Mock from '../MockEnvironment';
import { DidYouMean } from '../../src/ui/DidYouMean/DidYouMean';
import { IQueryCorrection } from '../../src/rest/QueryCorrection';
import { IWordCorrection } from '../../src/rest/QueryCorrection';
import { Simulate } from '../Simulate';
import { FakeResults } from '../Fake';
import { ISimulateQueryData } from '../Simulate';
import { analyticsActionCauseList } from '../../src/ui/Analytics/AnalyticsActionListMeta';
import { IDidYouMeanOptions } from '../../src/ui/DidYouMean/DidYouMean';
import { QueryStateModel } from '../../src/models/QueryStateModel';
import { $$ } from '../../src/utils/Dom';

export function DidYouMeanTest() {
  describe('DidYouMean', () => {
    let test: Mock.IBasicComponentSetup<DidYouMean>;
    let fakeQueryCorrection: IQueryCorrection;
    beforeEach(() => {
      test = Mock.basicComponentSetup<DidYouMean>(DidYouMean);
      fakeQueryCorrection = {
        correctedQuery: 'this is the corrected query',
        wordCorrections: [
          <IWordCorrection>{
            offset: 12,
            length: 9,
            originalWord: 'corected',
            correctedWord: 'corrected'
          }
        ]
      };
      test.env.queryStateModel.get = () => 'originalquery';
    });

    it('should be hidden before making a query', () => {
      expect(test.cmp.element.style.display).toBe('none');
    });

    it('should be shown when there are both query corrections and results', () => {
      Simulate.query(test.env, {
        results: FakeResults.createFakeResults(2),
        queryCorrections: [fakeQueryCorrection]
      });

      expect(test.cmp.element.style.display).not.toBe('none');
    });

    it('should be hidden when there are no query corrections', () => {
      Simulate.query(test.env, {
        results: FakeResults.createFakeResults(0),
        queryCorrections: []
      });

      expect(test.cmp.element.style.display).toBe('none');
    });

    it('should send an analytics event when doQueryWithCorrectedTerm is called', () => {
      const analyticsSpy = jasmine.createSpy('analyticsSpy');
      test.env.usageAnalytics.logSearchEvent = analyticsSpy;
      Simulate.query(test.env, <ISimulateQueryData>{
        queryCorrections: [fakeQueryCorrection]
      });
      test.env.queryController.deferExecuteQuery = arg => {
        arg.beforeExecuteQuery();
      };
      test.cmp.doQueryWithCorrectedTerm();
      expect(analyticsSpy).toHaveBeenCalledWith(analyticsActionCauseList.didyoumeanClick, {});
    });

    describe('exposes options', () => {
      describe('enableAutoCorrection', () => {
        describe('set to true', () => {
          beforeEach(() => {
            test = Mock.optionsComponentSetup<DidYouMean, IDidYouMeanOptions>(DidYouMean, <IDidYouMeanOptions>{
              enableAutoCorrection: true
            });
            test.env.queryStateModel.get = () => 'foobar';
          });

          it('should autocorrect the query when no results are found', () => {
            const qsmSpy = jasmine.createSpy('queryStateModelSpy');
            test.env.queryStateModel.set = qsmSpy;

            Simulate.query(test.env, {
              results: FakeResults.createFakeResults(0),
              queryCorrections: [fakeQueryCorrection]
            });

            expect(qsmSpy).toHaveBeenCalledWith(QueryStateModel.attributesEnum.q, 'this is the corrected query');
          });

          it('should send an analytics event when query is autocorrected', () => {
            const analyticsSpy = jasmine.createSpy('analyticsSpy');
            test.cmp.usageAnalytics.logSearchEvent = analyticsSpy;

            Simulate.query(test.env, {
              results: FakeResults.createFakeResults(0),
              queryCorrections: [fakeQueryCorrection]
            });

            expect(analyticsSpy).toHaveBeenCalledWith(analyticsActionCauseList.didyoumeanAutomatic, {});
            expect(analyticsSpy.calls.count()).toBe(1);
          });

          it('should replace the state in history manager when query is autocorrected', () => {
            spyOn(test.env.searchInterface.historyManager, 'replaceState');

            Simulate.query(test.env, {
              results: FakeResults.createFakeResults(0),
              queryCorrections: [fakeQueryCorrection]
            });

            expect(test.env.searchInterface.historyManager.replaceState).toHaveBeenCalled();
          });
        });

        describe('set to false', () => {
          beforeEach(() => {
            test = Mock.optionsComponentSetup<DidYouMean, IDidYouMeanOptions>(DidYouMean, <IDidYouMeanOptions>{
              enableAutoCorrection: false
            });
          });

          it('should not autocorrect the query when no results are found', () => {
            test.env.queryStateModel.get = () => 'foobar';
            const qsmSpy = jasmine.createSpy('queryStateModelSpy');
            test.env.queryStateModel.set = qsmSpy;

            Simulate.query(test.env, {
              results: FakeResults.createFakeResults(0),
              queryCorrections: [fakeQueryCorrection]
            });

            expect(qsmSpy).not.toHaveBeenCalled();
          });

          it('should not replace the state in history manager', () => {
            spyOn(test.env.searchInterface.historyManager, 'replaceState');

            Simulate.query(test.env, {
              results: FakeResults.createFakeResults(0),
              queryCorrections: [fakeQueryCorrection]
            });

            expect(test.env.searchInterface.historyManager.replaceState).not.toHaveBeenCalled();
          });
        });
      });
    });

    it('should not autocorrect search-as-you-type queries', () => {
      const qsmSpy = jasmine.createSpy('queryStateModelSpy');
      test.env.queryStateModel.set = qsmSpy;

      Simulate.query(test.env, {
        results: FakeResults.createFakeResults(0),
        searchAsYouType: true,
        queryCorrections: [fakeQueryCorrection]
      });

      expect(qsmSpy).not.toHaveBeenCalled();
    });

    it('correctedTerm should be null before a query', () => {
      expect(test.cmp.correctedTerm).toBeNull();
    });

    it('correctedTerm should be initialized properly from the queryCorrections', () => {
      Simulate.query(test.env, {
        queryCorrections: [fakeQueryCorrection]
      });

      expect(test.cmp.correctedTerm).toBe(fakeQueryCorrection.correctedQuery);
    });

    describe('doQueryWithCorrectedTerm', () => {
      it('should throw an exception if no query was made', () => {
        expect(() => test.cmp.doQueryWithCorrectedTerm()).toThrow();
      });

      it('should throw an exception if no corrections were available', () => {
        Simulate.query(test.env, {
          queryCorrections: []
        });

        expect(() => test.cmp.doQueryWithCorrectedTerm()).toThrow();
      });

      it('should execute a query when corrections were available', () => {
        Simulate.query(test.env, {
          queryCorrections: [fakeQueryCorrection]
        });

        const qsmSpy = jasmine.createSpy('queryStateModelSpy');
        test.env.queryStateModel.set = qsmSpy;
        test.cmp.doQueryWithCorrectedTerm();

        expect(qsmSpy).toHaveBeenCalledWith(QueryStateModel.attributesEnum.q, fakeQueryCorrection.correctedQuery);
        expect(qsmSpy.calls.count()).toBe(1);
      });
    });

    describe('escape the HTML against XSS', () => {
      beforeEach(() => {});

      it('when there are results', () => {
        Simulate.query(test.env, {
          queryCorrections: [
            <IQueryCorrection>{
              correctedQuery: '<script>alert("hack the internet")</script>'
            }
          ]
        });
        expect($$(test.cmp.element).find('.coveo-did-you-mean-suggestion a').innerHTML).toBe(
          '&lt;script&gt;alert("hack the internet")&lt;/script&gt;'
        );
      });

      it('when query is autocorrected', () => {
        Simulate.query(test.env, {
          results: FakeResults.createFakeResults(10),
          queryCorrections: [
            <IQueryCorrection>{
              correctedQuery: '<script>alert("thou shalt surely die")</script>'
            }
          ]
        });
        expect($$(test.cmp.element).find('.coveo-did-you-mean-suggestion a').innerHTML).toBe(
          '&lt;script&gt;alert("thou shalt surely die")&lt;/script&gt;'
        );
      });
    });
  });
}
