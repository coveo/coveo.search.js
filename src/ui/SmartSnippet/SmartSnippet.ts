import { ModalBox as ModalBoxModule } from '../../ExternalModulesShim';
import { exportGlobally } from '../../GlobalExports';
import { Component } from '../Base/Component';
import { IComponentBindings } from '../Base/ComponentBindings';
import { QueryEvents, Initialization, $$ } from '../../Core';
import { IQuerySuccessEventArgs } from '../../events/QueryEvents';
import { IQuestionAnswerResponse } from '../../rest/QuestionAnswerResponse';
import 'styling/_SmartSnippet';
import { find } from 'underscore';
import { IQueryResult } from '../../rest/QueryResult';
import { UserFeedbackBanner } from './UserFeedbackBanner';
import {
  analyticsActionCauseList,
  IAnalyticsNoMeta,
  IAnalyticsSmartSnippetFeedbackMeta,
  AnalyticsSmartSnippetFeedbackReason
} from '../Analytics/AnalyticsActionListMeta';
import { HeightLimiter } from './HeightLimiter';
import { ExplanationModal, IReason } from './ExplanationModal';
import { l } from '../../strings/Strings';
import { attachShadow } from '../../misc/AttachShadowPolyfill';
import { Utils } from '../../utils/Utils';

interface ISmartSnippetReason {
  analytics: AnalyticsSmartSnippetFeedbackReason;
  localeKey: string;
  hasDetails?: boolean;
}

const reasons: ISmartSnippetReason[] = [
  {
    analytics: AnalyticsSmartSnippetFeedbackReason.DoesNotAnswer,
    localeKey: 'UsefulnessFeedbackDoesNotAnswer'
  },
  {
    analytics: AnalyticsSmartSnippetFeedbackReason.PartiallyAnswers,
    localeKey: 'UsefulnessFeedbackPartiallyAnswers'
  },
  {
    analytics: AnalyticsSmartSnippetFeedbackReason.WasNotAQuestion,
    localeKey: 'UsefulnessFeedbackWasNotAQuestion'
  },
  {
    analytics: AnalyticsSmartSnippetFeedbackReason.Other,
    localeKey: 'Other',
    hasDetails: true
  }
];

const BASE_CLASSNAME = 'coveo-smart-snippet';
const QUESTION_CLASSNAME = `${BASE_CLASSNAME}-question`;
const ANSWER_CONTAINER_CLASSNAME = `${BASE_CLASSNAME}-answer`;
const HAS_ANSWER_CLASSNAME = `${BASE_CLASSNAME}-has-answer`;
const SHADOW_CLASSNAME = `${BASE_CLASSNAME}-content`;
const CONTENT_CLASSNAME = `${BASE_CLASSNAME}-content-wrapper`;
const SOURCE_CLASSNAME = `${BASE_CLASSNAME}-source`;
const SOURCE_TITLE_CLASSNAME = `${SOURCE_CLASSNAME}-title`;
const SOURCE_URL_CLASSNAME = `${SOURCE_CLASSNAME}-url`;

export const SmartSnippetClassNames = {
  QUESTION_CLASSNAME,
  ANSWER_CONTAINER_CLASSNAME,
  HAS_ANSWER_CLASSNAME,
  SHADOW_CLASSNAME,
  CONTENT_CLASSNAME,
  SOURCE_CLASSNAME,
  SOURCE_TITLE_CLASSNAME,
  SOURCE_URL_CLASSNAME
};

export interface ISmartSnippetOptions {}

export class SmartSnippet extends Component {
  static ID = 'SmartSnippet';

  static options: ISmartSnippetOptions = {};

  static doExport = () => {
    exportGlobally({
      SmartSnippet
    });
  };

  private lastRenderedResult: IQueryResult;
  private questionContainer: HTMLElement;
  private shadowContainer: HTMLElement;
  private sourceContainer: HTMLElement;
  private snippetContainer: HTMLElement;
  private heightLimiter: HeightLimiter;
  private explanationModal: ExplanationModal;
  private feedbackBanner: UserFeedbackBanner;
  private shadowLoading: Promise<HTMLElement>;

  constructor(
    public element: HTMLElement,
    public options?: ISmartSnippetOptions,
    bindings?: IComponentBindings,
    private ModalBox = ModalBoxModule
  ) {
    super(element, SmartSnippet.ID, bindings);
    this.bind.onRootElement(QueryEvents.deferredQuerySuccess, (data: IQuerySuccessEventArgs) => this.handleQuerySuccess(data));
  }

  private get style() {
    return $$(this.element)
      .children()
      .filter(element => element instanceof HTMLScriptElement && element.type.toLowerCase() === 'text/css')
      .map(element => element.innerHTML)
      .join('\n');
  }

  private set hasAnswer(hasAnswer: boolean) {
    $$(this.element).toggleClass(HAS_ANSWER_CLASSNAME, hasAnswer);
  }

  public createDom() {
    this.element.appendChild(this.buildAnswerContainer());
    this.feedbackBanner = new UserFeedbackBanner(
      isUseful => (isUseful ? this.sendLikeSmartSnippetAnalytics() : this.sendDislikeSmartSnippetAnalytics()),
      () => this.openExplanationModal()
    );
    this.element.appendChild(this.feedbackBanner.build());
    this.explanationModal = new ExplanationModal({
      reasons: reasons.map(
        reason =>
          <IReason>{
            label: l(reason.localeKey),
            id: reason.analytics.replace(/_/g, '-'),
            onSelect: () => this.sendExplanationAnalytics(reason.analytics, this.explanationModal.details),
            hasDetails: reason.hasDetails
          }
      ),
      onClosed: () => this.sendCloseFeedbackModalAnalytics(),
      ownerElement: this.searchInterface.options.modalContainer,
      modalBoxModule: this.ModalBox
    });
  }

  private buildAnswerContainer() {
    return $$(
      'div',
      {
        className: ANSWER_CONTAINER_CLASSNAME
      },
      this.buildQuestion(),
      this.buildShadow(),
      this.buildHeightLimiter(),
      this.buildSourceContainer()
    ).el;
  }

  private buildQuestion() {
    return (this.questionContainer = $$('div', { className: QUESTION_CLASSNAME }).el);
  }

  private buildShadow() {
    this.shadowContainer = $$('div', { className: SHADOW_CLASSNAME }).el;
    this.snippetContainer = $$('section', { className: CONTENT_CLASSNAME }).el;
    this.shadowLoading = attachShadow(this.shadowContainer, { mode: 'open', title: l('AnswerSnippet') }).then(shadow => {
      shadow.appendChild(this.snippetContainer);
      const style = this.buildStyle();
      if (style) {
        shadow.appendChild(style);
      }
      return shadow;
    });
    return this.shadowContainer;
  }

  private buildHeightLimiter() {
    return (this.heightLimiter = new HeightLimiter(this.shadowContainer, this.snippetContainer, 400, isExpanded =>
      isExpanded ? this.sendExpandSmartSnippetAnalytics() : this.sendCollapseSmartSnippetAnalytics()
    )).toggleButton;
  }

  private buildSourceContainer() {
    return (this.sourceContainer = $$('div', { className: SOURCE_CLASSNAME }).el);
  }

  private buildStyle() {
    const style = this.style;
    if (!style) {
      return;
    }
    const styleTag = document.createElement('style');
    styleTag.innerHTML = style;
    return styleTag;
  }

  /**
   * @warning This method only works for the demo. In practice, the source of the answer will not always be part of the results.
   */
  private getCorrespondingResult(questionAnswer: IQuestionAnswerResponse) {
    return find(
      this.queryController.getLastResults().results,
      result => result.raw[questionAnswer.documentId.contentIdKey] === questionAnswer.documentId.contentIdValue
    );
  }

  private async handleQuerySuccess(data: IQuerySuccessEventArgs) {
    const { questionAnswer } = data.results;
    if (!questionAnswer) {
      this.hasAnswer = false;
      return;
    }
    this.hasAnswer = true;
    await this.render(questionAnswer);
  }

  private async render(questionAnswer: IQuestionAnswerResponse) {
    this.ensureDom();
    this.questionContainer.innerText = questionAnswer.question;
    this.renderSnippet(questionAnswer.answerSnippet);
    const lastRenderedResult = this.getCorrespondingResult(questionAnswer);
    if (lastRenderedResult) {
      this.renderSource(lastRenderedResult);
    }
    await this.shadowLoading;
    await Utils.resolveAfter(0); // `scrollHeight` isn't instantly detected, or at-least not on IE11.
    this.heightLimiter.onContentHeightChanged();
  }

  private renderSnippet(content: string) {
    this.snippetContainer.innerHTML = content;
  }

  private renderSource(source: IQueryResult) {
    $$(this.sourceContainer).empty();
    this.sourceContainer.appendChild(this.renderSourceUrl(source.clickUri));
    this.sourceContainer.appendChild(this.renderSourceTitle(source.title, source.clickUri));
  }

  private renderSourceTitle(title: string, clickUri: string) {
    return this.renderLink(title, clickUri, SOURCE_TITLE_CLASSNAME);
  }

  private renderSourceUrl(url: string) {
    return this.renderLink(url, url, SOURCE_URL_CLASSNAME);
  }

  private renderLink(text: string, href: string, className: string) {
    const element = $$('a', { className, href }).el as HTMLAnchorElement;
    element.innerText = text;
    this.enableAnalyticsOnLink(element, () => this.sendOpenSourceAnalytics());
    return element;
  }

  private enableAnalyticsOnLink(link: HTMLAnchorElement, sendAnalytics: () => Promise<any>) {
    link.addEventListener('click', e => {
      e.preventDefault();
      this.openLink(link.href, e.ctrlKey, sendAnalytics);
    });
  }

  private openLink(href: string, newTab: boolean, sendAnalytics: () => Promise<any>) {
    sendAnalytics();
    if (newTab) {
      window.open(href);
    } else {
      window.location.href = href;
    }
  }

  private openExplanationModal() {
    this.sendOpenFeedbackModalAnalytics();
    this.explanationModal.open(this.feedbackBanner.explainWhy);
  }

  private sendLikeSmartSnippetAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.likeSmartSnippet,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendDislikeSmartSnippetAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.dislikeSmartSnippet,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendExpandSmartSnippetAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.expandSmartSnippet,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendCollapseSmartSnippetAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.collapseSmartSnippet,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendOpenSourceAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.openSmartSnippetSource,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendOpenFeedbackModalAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.openSmartSnippetFeedbackModal,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendCloseFeedbackModalAnalytics() {
    return this.usageAnalytics.logCustomEvent<IAnalyticsNoMeta>(
      analyticsActionCauseList.closeSmartSnippetFeedbackModal,
      {},
      this.element,
      this.lastRenderedResult
    );
  }

  private sendExplanationAnalytics(reason: AnalyticsSmartSnippetFeedbackReason, details?: string) {
    return this.usageAnalytics.logCustomEvent<IAnalyticsSmartSnippetFeedbackMeta>(
      analyticsActionCauseList.sendSmartSnippetReason,
      {
        reason,
        details
      },
      this.element,
      this.lastRenderedResult
    );
  }
}
Initialization.registerAutoCreateComponent(SmartSnippet);
