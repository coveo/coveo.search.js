webpackJsonpCoveo__temporary([65],{264:function(t,e,n){"use strict";var o=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n])};return function(e,n){function o(){this.constructor=e}t(e,n),e.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o)}}();Object.defineProperty(e,"__esModule",{value:!0});var r=n(7),i=n(8),s=n(11),u=n(5),a=n(1),l=n(6),c=n(2),p=n(23),y=n(3);n(634);var f=function(t){function e(n,o,r){var u=t.call(this,n,e.ID,r)||this;return u.element=n,u.options=o,u.options=i.ComponentOptions.initComponentOptions(n,e,o),u.bind.onRootElement(s.QueryEvents.querySuccess,function(t){return u.handleQuerySuccess(t)}),u.bind.onRootElement(s.QueryEvents.queryError,function(){return a.$$(u.element).hide()}),u.element.style.display="none",u.textContainer=a.$$("span").el,u.element.appendChild(u.textContainer),u}return o(e,t),e.prototype.handleQuerySuccess=function(t){if(!this.disabled&&t.results.results.length>0){u.Assert.exists(t);var e=[l.l("Duration",this.formatQueryDuration(t.results.duration)),l.l("SearchAPIDuration",this.formatQueryDuration(t.results.searchAPIDuration)),l.l("IndexDuration",this.formatQueryDuration(t.results.indexDuration))].join("\n");this.textContainer.textContent=this.formatQueryDuration(t.results.duration),this.element.setAttribute("title",e),this.element.style.display="inline"}else this.element.style.display="none"},e.prototype.formatQueryDuration=function(t){if(void 0==t)return l.l("Unavailable");var e=Math.max(t/1e3,.01);return"en"===String.locale?l.l("Seconds",p.format(e,"n2"),e,!0):l.l("Seconds",p.format(e,"n2"),e)},e.ID="QueryDuration",e.doExport=function(){y.exportGlobally({QueryDuration:e})},e.options={},e}(r.Component);e.QueryDuration=f,c.Initialization.registerAutoCreateComponent(f)},634:function(t,e){}});
//# sourceMappingURL=QueryDuration.min__ab6807e9ec195c274856.js.map